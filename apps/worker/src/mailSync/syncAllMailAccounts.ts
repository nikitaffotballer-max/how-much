import type { PrismaClient } from '@how-much/db';
import {
  HC_MAIL_SYNC_JOB_OPTIONS,
  HC_MAIL_SYNC_JOBS,
  mailSyncJobId,
  type MailSyncJob,
} from '@how-much/shared';
import type { Queue } from 'bullmq';

/**
 * Плановый обход раз в 15 минут: ставит синхронизацию каждого рабочего ящика
 * и заодно удаляет исходные письма старше 30 дней.
 */
export async function syncAllMailAccounts(db: PrismaClient, queue: Queue<MailSyncJob>) {
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

  const { count: deleted } = await db.rawEmail.deleteMany({
    where: { deleteAfter: { lt: new Date() } },
  });

  return { queued: accounts.length, deleted };
}
