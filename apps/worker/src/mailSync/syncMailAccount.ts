import type { PrismaClient } from '@how-much/db';
import {
  decryptSecret,
  fetchReceiptEmails,
  folderCursorsSchema,
  HCMailAuthError,
  type FetchRange,
  type FolderCursors,
  type ImapServer,
  type MailCredentials,
  type ReceiptEmail,
} from '@how-much/mail';
import { effectivePlan, HC_MAIL_PROVIDERS, HC_PLAN_LIMITS } from '@how-much/shared';

/** Исходное письмо храним 30 дней для переразбора, потом удаляем (ТЗ, 3.3). */
export const RAW_EMAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type FetchEmails = (
  server: ImapServer,
  credentials: MailCredentials,
  range: FetchRange,
) => AsyncIterable<ReceiptEmail>;

export interface SyncDeps {
  db: PrismaClient;
  encryptionKey: Buffer;
  /** Ставит сохранённое письмо в очередь разбора. */
  enqueueParse: (rawEmailId: string) => Promise<void>;
  /** В тестах подменяется, чтобы не ходить на настоящий IMAP-сервер. */
  fetchEmails?: FetchEmails;
  now?: Date;
}

export type SyncResult =
  { status: 'skipped' } | { status: 'auth_failed' } | { status: 'synced'; saved: number };

function monthsAgo(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

/**
 * Забирает новые письма-чеки из ящика, сохраняет их как RawEmail в статусе pending
 * и сразу ставит каждое в очередь разбора (ТЗ, 3.3).
 */
export async function syncMailAccount(deps: SyncDeps, mailAccountId: string): Promise<SyncResult> {
  const {
    db,
    encryptionKey,
    enqueueParse,
    fetchEmails = fetchReceiptEmails,
    now = new Date(),
  } = deps;

  const account = await db.mailAccount.findUnique({
    where: { id: mailAccountId },
    include: { user: { include: { subscription: true } } },
  });
  // Ящик успели удалить или отключить, пока задача ждала в очереди.
  if (!account || account.status === 'disabled') return { status: 'skipped' };

  const plan = effectivePlan({ subscriptionStatus: account.user.subscription?.status ?? null });
  // Испорченный JSON не должен останавливать синхронизацию: тогда просто перечитаем папки.
  const stored = folderCursorsSchema.safeParse(account.folderCursors);
  const cursors: FolderCursors = stored.success ? stored.data : {};
  const range: FetchRange = {
    cursors: { ...cursors },
    since: monthsAgo(now, HC_PLAN_LIMITS[plan].importMonths),
  };
  const credentials: MailCredentials = {
    login: account.login,
    password: decryptSecret(account.encryptedPassword, encryptionKey),
  };
  const deleteAfter = new Date(now.getTime() + RAW_EMAIL_TTL_MS);

  let saved = 0;
  try {
    for await (const email of fetchEmails(
      HC_MAIL_PROVIDERS[account.provider].imap,
      credentials,
      range,
    )) {
      // skipDuplicates: письмо, сохранённое прошлой (оборвавшейся) синхронизацией, пропускаем.
      const created = await db.rawEmail.createManyAndReturn({
        data: {
          mailAccountId,
          messageId: email.messageId,
          fromAddress: email.fromAddress,
          subject: email.subject,
          receivedAt: email.receivedAt,
          html: email.html,
          deleteAfter,
        },
        skipDuplicates: true,
        select: { id: true },
      });
      for (const { id } of created) await enqueueParse(id);
      saved += created.length;
      const previous = cursors[email.folder];
      cursors[email.folder] = {
        uidValidity: email.uidValidity,
        lastUid:
          previous?.uidValidity === email.uidValidity
            ? Math.max(previous.lastUid, email.uid)
            : email.uid,
      };
    }
  } catch (error) {
    if (error instanceof HCMailAuthError) {
      // Пароль приложения отозвали или сменили: повторять бесполезно, пользователь увидит предупреждение.
      await db.mailAccount.updateMany({
        where: { id: mailAccountId },
        data: { status: 'auth_failed' },
      });
      return { status: 'auth_failed' };
    }
    throw error;
  }

  await db.mailAccount.updateMany({
    where: { id: mailAccountId },
    data: { folderCursors: cursors, lastSyncAt: now, status: 'active' },
  });
  return { status: 'synced', saved };
}
