import { verifyMailLogin, type MailCredentials } from '@how-much/mail';
import {
  HC_MAIL_PROVIDERS,
  HC_MAIL_SYNC_JOB_OPTIONS,
  HC_MAIL_SYNC_JOBS,
  HC_QUEUES,
  mailSyncJobId,
  type MailProviderKey,
  type MailSyncJob,
} from '@how-much/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Всё, что API нужно от почты: проверить вход и поставить синхронизацию в очередь.
 * Отдельный интерфейс, чтобы в тестах подменить IMAP и Redis.
 */
export interface MailGateway {
  /** Бросает HCMailAuthError или HCMailConnectionError из @how-much/mail. */
  verifyLogin(provider: MailProviderKey, credentials: MailCredentials): Promise<void>;
  enqueueSync(mailAccountId: string): Promise<void>;
  close(): Promise<void>;
}

export function createMailGateway(redisUrl: string): MailGateway {
  // Без очереди офлайн-команд: если Redis лежит, запрос пользователя не повиснет, а сразу получит ошибку.
  const connection = new Redis(redisUrl, { enableOfflineQueue: false });
  const queue = new Queue<MailSyncJob>(HC_QUEUES.mailSync, { connection });

  return {
    // API ходит в почту только здесь: один вход для проверки пароля, письма читает воркер.
    verifyLogin: (provider, credentials) =>
      verifyMailLogin(HC_MAIL_PROVIDERS[provider].imap, credentials),

    async enqueueSync(mailAccountId) {
      await queue.add(
        HC_MAIL_SYNC_JOBS.account,
        { mailAccountId },
        { ...HC_MAIL_SYNC_JOB_OPTIONS, jobId: mailSyncJobId(mailAccountId) },
      );
    },

    async close() {
      await queue.close();
      await connection.quit();
    },
  };
}
