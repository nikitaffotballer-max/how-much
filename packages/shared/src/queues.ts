/** Имена очередей BullMQ. Общие для API (ставит задачи) и воркеров (выполняют). */
export const HC_QUEUES = {
  mailSync: 'mail-sync',
  receiptParse: 'receipt-parse',
  itemNormalize: 'item-normalize',
} as const;

/** Задачи очереди mail-sync: один ящик или обход всех ящиков по расписанию. */
export const HC_MAIL_SYNC_JOBS = {
  account: 'sync-account',
  all: 'sync-all',
} as const;

/** Как часто проверяем новые письма (ТЗ, 3.2). */
export const HC_MAIL_SYNC_INTERVAL_MS = 15 * 60 * 1000;

export interface MailSyncJob {
  mailAccountId: string;
}

export interface ReceiptParseJob {
  rawEmailId: string;
}

/**
 * Один id задачи на ящик: пока синхронизация стоит в очереди или идёт,
 * повторное нажатие «Обновить» не создаёт вторую такую же.
 */
export function mailSyncJobId(mailAccountId: string): string {
  return `sync-${mailAccountId}`;
}

/** Настройки задачи синхронизации ящика — одинаковые для API и планировщика в воркере. */
export const HC_MAIL_SYNC_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 30_000 },
  // Удаляем и упавшие задачи: иначе задача с тем же jobId не даст поставить новую.
  removeOnComplete: true,
  removeOnFail: true,
} as const;

/** Разбор письма в чек. Повторы — только на случай, если модель не ответила. */
export const HC_RECEIPT_PARSE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: true,
  removeOnFail: true,
} as const;

export function receiptParseJobId(rawEmailId: string): string {
  return `parse-${rawEmailId}`;
}
