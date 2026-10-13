import { createPrismaClient } from '@how-much/db';
import {
  HC_MAIL_SYNC_INTERVAL_MS,
  HC_MAIL_SYNC_JOBS,
  HC_QUEUES,
  type MailSyncJob,
} from '@how-much/shared';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { syncAllMailAccounts } from './mailSync/syncAllMailAccounts.js';
import { syncMailAccount } from './mailSync/syncMailAccount.js';

const config = loadConfig();
const db = createPrismaClient(config.DATABASE_URL);

// BullMQ требует maxRetriesPerRequest: null — иначе воркер падает при коротких обрывах связи с Redis.
const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
const mailSyncQueue = new Queue<MailSyncJob>(HC_QUEUES.mailSync, { connection });

// Повторный вызов только обновляет расписание, поэтому перезапуск воркера не плодит дублей.
await mailSyncQueue.upsertJobScheduler(
  'mail-sync-all',
  { every: HC_MAIL_SYNC_INTERVAL_MS },
  { name: HC_MAIL_SYNC_JOBS.all },
);

const mailSyncWorker = new Worker<MailSyncJob>(
  HC_QUEUES.mailSync,
  async (job) => {
    if (job.name === HC_MAIL_SYNC_JOBS.all) {
      const { queued, deleted } = await syncAllMailAccounts(db, mailSyncQueue);
      await job.log(`Поставлено ящиков: ${queued}, удалено старых писем: ${deleted}`);
      return;
    }

    const result = await syncMailAccount(
      { db, encryptionKey: config.MAIL_ENCRYPTION_KEY },
      job.data.mailAccountId,
    );
    await job.log(`Ящик ${job.data.mailAccountId}: ${JSON.stringify(result)}`);
  },
  // Синхронизация почти всё время ждёт сеть, поэтому несколько ящиков обрабатываем параллельно.
  { connection, concurrency: 5 },
);

mailSyncWorker.on('failed', (job, error) => {
  console.error(`[${HC_QUEUES.mailSync}] задача ${job?.id} упала:`, error.message);
});

console.log(`Воркеры запущены, Redis: ${config.REDIS_URL}`);

async function shutdown() {
  await mailSyncWorker.close();
  await mailSyncQueue.close();
  await connection.quit();
  await db.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
