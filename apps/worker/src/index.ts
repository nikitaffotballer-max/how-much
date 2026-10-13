import { HC_QUEUES, type MailSyncJob } from '@how-much/shared';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

// BullMQ требует maxRetriesPerRequest: null — иначе воркер падает при коротких обрывах связи с Redis.
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

/**
 * Синхронизация почты. Пока заглушка: реальное чтение IMAP появится на этапе 1
 * (ТЗ, 3.2) — здесь только проверяем, что очередь и воркер связаны.
 */
const mailSyncWorker = new Worker<MailSyncJob>(
  HC_QUEUES.mailSync,
  async (job) => {
    await job.log(`Синхронизация ящика ${job.data.mailAccountId}: пока не реализована`);
  },
  { connection },
);

mailSyncWorker.on('failed', (job, error) => {
  console.error(`[${HC_QUEUES.mailSync}] задача ${job?.id} упала:`, error.message);
});

console.log(`Воркеры запущены, Redis: ${redisUrl}`);

async function shutdown() {
  await mailSyncWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
