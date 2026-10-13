import type { MailAccount as MailAccountRow } from '@how-much/db';
import { encryptSecret, HCMailAuthError, HCMailConnectionError } from '@how-much/mail';
import {
  connectMailAccountSchema,
  effectivePlan,
  HC_PLAN_LIMITS,
  mailAccountSchema,
  type MailAccount,
} from '@how-much/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../auth/requestUser.js';
import { HCHttpError } from '../errors.js';
import type { MailGateway } from '../mail/mailGateway.js';

const idParamsSchema = z.object({ id: z.string() });

const notFound = () => new HCHttpError(404, 'mail_account_not_found', 'Почтовый ящик не найден');

function toMailAccount(row: MailAccountRow & { _count: { rawEmails: number } }): MailAccount {
  return mailAccountSchema.parse({
    id: row.id,
    provider: row.provider,
    login: row.login,
    status: row.status,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    emailsFound: row._count.rawEmails,
  });
}

const withEmailsCount = { _count: { select: { rawEmails: true } } } as const;

export const mailAccountRoutes =
  (mail: MailGateway): FastifyPluginAsync =>
  async (app) => {
    /** Синхронизация не должна мешать ответу: если очередь недоступна, ящик заберёт плановый обход. */
    async function enqueueSyncSafely(mailAccountId: string) {
      try {
        await mail.enqueueSync(mailAccountId);
      } catch (error) {
        app.log.warn({ err: error, mailAccountId }, 'Не удалось поставить синхронизацию в очередь');
      }
    }

    app.get('/mail-accounts', async (request) => {
      const userId = requireUserId(request);
      const rows = await app.db.mailAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: withEmailsCount,
      });
      return rows.map(toMailAccount);
    });

    app.post(
      '/mail-accounts',
      {
        config: {
          // Каждая попытка — это вход в почту; не даём подбирать пароли через нас.
          // Лимит на пользователя, поэтому считаем на этапе preHandler, когда userId уже известен.
          rateLimit: {
            max: 10,
            timeWindow: '10 minutes',
            hook: 'preHandler',
            keyGenerator: (request) => request.userId ?? request.ip,
          },
        },
      },
      async (request, reply) => {
        const userId = requireUserId(request);
        const { provider, login, appPassword } = connectMailAccountSchema.parse(request.body);

        const user = await app.db.user.findUniqueOrThrow({
          where: { id: userId },
          include: { subscription: true, _count: { select: { mailAccounts: true } } },
        });
        const plan = effectivePlan({ subscriptionStatus: user.subscription?.status ?? null });
        const limit = HC_PLAN_LIMITS[plan].mailAccounts;
        if (user._count.mailAccounts >= limit) {
          throw new HCHttpError(
            403,
            'mail_accounts_limit',
            plan === 'free'
              ? 'На тарифе Free можно подключить один ящик. В Pro — до пяти.'
              : `Можно подключить не больше ${limit} ящиков`,
          );
        }

        const existing = await app.db.mailAccount.findUnique({
          where: { userId_login: { userId, login } },
        });
        if (existing) {
          throw new HCHttpError(409, 'mail_account_exists', 'Этот ящик уже подключён');
        }

        try {
          await mail.verifyLogin(provider, { login, password: appPassword });
        } catch (error) {
          if (error instanceof HCMailAuthError) {
            throw new HCHttpError(
              422,
              'mail_auth_failed',
              'Почта не приняла логин или пароль приложения. Проверьте, что пароль скопирован целиком и в ящике включён доступ по IMAP.',
            );
          }
          if (error instanceof HCMailConnectionError) {
            throw new HCHttpError(
              502,
              'mail_unreachable',
              'Не удалось связаться с почтовым сервером. Попробуйте через минуту.',
            );
          }
          throw error;
        }

        const row = await app.db.mailAccount.create({
          data: {
            userId,
            provider,
            login,
            encryptedPassword: encryptSecret(appPassword, app.hcConfig.MAIL_ENCRYPTION_KEY),
          },
          include: withEmailsCount,
        });

        await enqueueSyncSafely(row.id);
        return reply.status(201).send(toMailAccount(row));
      },
    );

    app.delete('/mail-accounts/:id', async (request, reply) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      // Чеки остаются: удаляются только доступ к ящику и сохранённые исходные письма.
      const { count } = await app.db.mailAccount.deleteMany({ where: { id, userId } });
      if (count === 0) throw notFound();
      return reply.status(204).send();
    });

    app.post(
      '/mail-accounts/:id/sync',
      {
        config: {
          // «Обновить сейчас» — не чаще раза в минуту для каждого ящика (ТЗ, раздел 8).
          rateLimit: {
            max: 1,
            timeWindow: '1 minute',
            keyGenerator: (request) => `mail-sync:${(request.params as { id?: string }).id}`,
          },
        },
      },
      async (request, reply) => {
        const userId = requireUserId(request);
        const { id } = idParamsSchema.parse(request.params);
        const account = await app.db.mailAccount.findFirst({ where: { id, userId } });
        if (!account) throw notFound();

        await mail.enqueueSync(account.id);
        return reply.status(202).send();
      },
    );
  };
