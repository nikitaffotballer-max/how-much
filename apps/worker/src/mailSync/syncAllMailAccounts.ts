import type { PrismaClient } from '@how-much/db';
import {
  HC_MAIL_SYNC_JOB_OPTIONS,
  HC_MAIL_SYNC_JOBS,
  mailSyncJobId,
  type MailSyncJob,
} from '@how-much/shared';
import type { Queue } from 'bullmq';

/** Сколько неразобранных писем за один обход возвращаем в очередь. */
const PENDING_SWEEP_LIMIT = 500;

/**
 * Плановый обход раз в 15 минут: ставит синхронизацию каждого рабочего ящика,
 * возвращает в очередь письма, которые так и не разобрались (например, воркер перезапускали),
 * и удаляет исходные письма старше 30 дней.
 */
export async function syncAllMailAccounts(
  db: PrismaClient,
  queue: Queue<MailSyncJob>,
  enqueueParse: (rawEmailId: string) => Promise<void>,
) {
  // Ящики с ошибкой входа не трогаем: пароль сам не исправится, а почта может заблокировать вход.
  const accounts = await db.mailAccount.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  await queue.addBulk(
    accounts.map(({ id }) => ({
      name: HC_MAIL_SYNC_JOBS.account,
      data: { mailAccountId: id },
      opts: { ...HC_MAIL_SYNC_JOB_OPTIONS, jobId: mailSyncJobId(id) },
    })),
  );

  // У задачи разбора постоянный jobId, поэтому письмо, которое уже в очереди, не задвоится.
  const pending = await db.rawEmail.findMany({
    where: { parseStatus: 'pending' },
    select: { id: true },
    orderBy: { receivedAt: 'asc' },
    take: PENDING_SWEEP_LIMIT,
  });
  for (const { id } of pending) await enqueueParse(id);

  const { count: deleted } = await db.rawEmail.deleteMany({
    where: { deleteAfter: { lt: new Date() } },
  });

  return { queued: accounts.length, pending: pending.length, deleted };
}
