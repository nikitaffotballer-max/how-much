import type { PrismaClient, Subscription, User } from '@how-much/db';
import { credentialsSchema, effectivePlan, loginSchema, type CurrentUser } from '@how-much/shared';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { getDummyHash, hashPassword, verifyPassword } from '../auth/password.js';
import { requireUserId } from '../auth/requestUser.js';
import { createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_MS } from '../auth/session.js';
import { HCHttpError, unauthorized } from '../errors.js';

const TRIAL_DAYS = 14;

/** Защита от перебора паролей: не больше 10 попыток в минуту с одного IP. */
const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

function toCurrentUser(user: User & { subscription: Subscription | null }): CurrentUser {
  const status = user.subscription?.status ?? null;
  return {
    id: user.id,
    email: user.email,
    plan: effectivePlan({ subscriptionStatus: status }),
    subscriptionStatus: status,
    periodEndsAt: user.subscription?.currentPeriodEnd.toISOString() ?? null,
  };
}

function findUserByEmail(db: PrismaClient, email: string) {
  return db.user.findUnique({ where: { email }, include: { subscription: true } });
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const isProduction = app.hcConfig.NODE_ENV === 'production';

  async function startSession(reply: FastifyReply, userId: string, userAgent?: string) {
    const token = await createSession(app.db, userId, userAgent);
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      // Lax: cookie не уходит с POST-запросами с чужих сайтов — это защищает от CSRF.
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    });
  }

  app.post('/auth/register', { config: authRateLimit }, async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body);

    if (await findUserByEmail(app.db, email)) {
      throw new HCHttpError(409, 'email_taken', 'Этот email уже зарегистрирован');
    }

    // Каждый новый пользователь получает 14 дней Pro бесплатно (ТЗ, раздел 4).
    const user = await app.db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        subscription: {
          create: {
            status: 'trialing',
            currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true },
    });

    await startSession(reply, user.id, request.headers['user-agent']);
    return reply.status(201).send(toCurrentUser(user));
  });

  app.post('/auth/login', { config: authRateLimit }, async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await findUserByEmail(app.db, email);

    const passwordOk = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
    if (!user || !passwordOk) {
      // Один и тот же ответ для «нет такого email» и «неверный пароль».
      throw new HCHttpError(401, 'invalid_credentials', 'Неверный email или пароль');
    }

    await startSession(reply, user.id, request.headers['user-agent']);
    return toCurrentUser(user);
  });

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await deleteSession(app.db, token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  app.get('/me', async (request) => {
    const userId = requireUserId(request);
    const user = await app.db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw unauthorized();
    return toCurrentUser(user);
  });
};
