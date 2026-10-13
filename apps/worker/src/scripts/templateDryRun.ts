/**
 * Проверка шаблонного разбора на сохранённых письмах — без записи в базу и без модели.
 * Печатает только счётчики по отправителям. Запуск: pnpm --filter @how-much/worker receipts:dry-run
 */
import { createPrismaClient } from '@how-much/db';
import { loadConfig } from '../config.js';
import { checkReceipt } from '../receipts/checkReceipt.js';
import { receiptTextFromHtml } from '../receipts/emailText.js';
import { readReceiptTemplate, readRequisites } from '../receipts/templateParser.js';

const config = loadConfig();
const db = createPrismaClient(config.DATABASE_URL);

type Outcome = 'нет чека' | 'шаблон' | 'не сошлось' | 'не узнан';
const stats = new Map<string, Record<Outcome, number>>();
const reasons = new Map<string, number>();

try {
  const emails = await db.rawEmail.findMany({
    select: { fromAddress: true, subject: true, html: true },
  });
  for (const email of emails) {
    const domain = email.fromAddress.split('@')[1] ?? '?';
    const text = receiptTextFromHtml(email.html);
    const requisites = readRequisites(text);
    let outcome: Outcome;
    if (requisites.total === null && requisites.fn === null && requisites.fd === null) {
      outcome = 'нет чека';
    } else {
      const result = readReceiptTemplate(text, email.subject);
      const checked = 'draft' in result ? checkReceipt(result.draft) : null;
      if (!checked) {
        outcome = 'не узнан';
        const key = `${domain}: нет — ${'missing' in result ? result.missing : ''}`;
        reasons.set(key, (reasons.get(key) ?? 0) + 1);
      } else if (checked.ok) outcome = 'шаблон';
      else {
        outcome = 'не сошлось';
        const key = `${domain}: ${checked.reason.replace(/[\d\s,]+₽/g, 'N ₽')}`;
        reasons.set(key, (reasons.get(key) ?? 0) + 1);
      }
    }
    const row = stats.get(domain) ?? { 'нет чека': 0, шаблон: 0, 'не сошлось': 0, 'не узнан': 0 };
    row[outcome] += 1;
    stats.set(domain, row);
  }
  console.table(Object.fromEntries(stats));
  if (reasons.size > 0) console.table(Object.fromEntries(reasons));
} finally {
  await db.$disconnect();
}
