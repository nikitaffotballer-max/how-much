import { createPrismaClient } from '@how-much/db';
import { createClaudeCliProvider } from '@how-much/llm';
import {
  HC_MAIL_SYNC_INTERVAL_MS,
  HC_MAIL_SYNC_JOBS,
  HC_QUEUES,
  HC_RECEIPT_PARSE_JOB_OPTIONS,
  receiptParseJobId,
  type MailSyncJob,
  type ReceiptParseJob,
} from '@how-much/shared';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { syncAllMailAccounts } from './mailSync/syncAllMailAccounts.js';
import { syncMailAccount } from './mailSync/syncMailAccount.js';
import { parseRawEmail } from './receipts/parseRawEmail.js';

const config = loadConfig();
const db = createPrismaClient(config.DATABASE_URL);
const llm = createClaudeCliProvider({ binary: config.CLAUDE_CLI_PATH, model: config.LLM_MODEL });

// BullMQ требует maxRetriesPerRequest: null — иначе воркер падает при коротких обрывах связи с Redis.
const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
const mailSyncQueue = new Queue<MailSyncJob>(HC_QUEUES.mailSync, { connection });
const receiptParseQueue = new Queue<ReceiptParseJob>(HC_QUEUES.receiptParse, { connection });

async function enqueueParse(rawEmailId: string) {
  await receiptParseQueue.add(
    'parse',
    { rawEmailId },
    { ...HC_RECEIPT_PARSE_JOB_OPTIONS, jobId: receiptParseJobId(rawEmailId) },
  );
}

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
      const result = await syncAllMailAccounts(db, mailSyncQueue, enqueueParse);
      await job.log(`Плановый обход: ${JSON.stringify(result)}`);
      return;
    }

    const result = await syncMailAccount(
      { db, encryptionKey: config.MAIL_ENCRYPTION_KEY, enqueueParse },
      job.data.mailAccountId,
    );
    await job.log(`Ящик ${job.data.mailAccountId}: ${JSON.stringify(result)}`);
  },
  // Синхронизация почти всё время ждёт сеть, поэтому несколько ящиков обрабатываем параллельно.
  { connection, concurrency: 5 },
);

const receiptParseWorker = new Worker<ReceiptParseJob>(
  HC_QUEUES.receiptParse,
  async (job) => {
    const result = await parseRawEmail({ db, llm }, job.data.rawEmailId);
    await job.log(`Письмо ${job.data.rawEmailId}: ${result}`);
  },
  // Каждый разбор — отдельный запрос к модели; больше двух сразу упирается в лимиты подписки.
  { connection, concurrency: 2 },
);

mailSyncWorker.on('failed', (job, error) => {
  console.error(`[${HC_QUEUES.mailSync}] задача ${job?.id} упала:`, error.message);
});

receiptParseWorker.on('failed', async (job, error) => {
  console.error(`[${HC_QUEUES.receiptParse}] задача ${job?.id} упала:`, error.message);
  // Попытки кончились — показываем письмо в «Требуют внимания», чтобы оно не крутилось вечно.
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await db.rawEmail.updateMany({
      where: { id: job.data.rawEmailId, parseStatus: 'pending' },
      data: { parseStatus: 'failed', parseError: 'Не удалось разобрать письмо автоматически' },
    });
  }
});

console.log(`Воркеры запущены, Redis: ${config.REDIS_URL}, модель: ${llm.name}`);

async function shutdown() {
  await Promise.all([mailSyncWorker.close(), receiptParseWorker.close()]);
  await Promise.all([mailSyncQueue.close(), receiptParseQueue.close()]);
  await connection.quit();
  await db.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
