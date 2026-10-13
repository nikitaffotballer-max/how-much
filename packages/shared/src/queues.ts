/** Имена очередей BullMQ. Общие для API (ставит задачи) и воркеров (выполняют). */
export const HC_QUEUES = {
  mailSync: 'mail-sync',
  receiptParse: 'receipt-parse',
  itemNormalize: 'item-normalize',
} as const;

export interface MailSyncJob {
  mailAccountId: string;
}
