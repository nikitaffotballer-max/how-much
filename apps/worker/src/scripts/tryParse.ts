import { createPrismaClient } from '@how-much/db';
import { createClaudeCliProvider } from '@how-much/llm';
import { readFileSync } from 'node:fs';
import { loadConfig } from '../config.js';
import { checkReceipt } from '../receipts/checkReceipt.js';
import { receiptTextFromHtml } from '../receipts/emailText.js';
import { extractReceipt } from '../receipts/extractReceipt.js';

/**
 * Пробный разбор письма без записи в базу: показывает, что увидела модель и прошла ли проверка.
 * Запуск: pnpm --filter @how-much/worker try:parse путь/к/письму.html
 */
const file = process.argv[2];
if (!file) throw new Error('Укажите путь к HTML-файлу письма');

const config = loadConfig();
const db = createPrismaClient(config.DATABASE_URL);
const llm = createClaudeCliProvider({ binary: config.CLAUDE_CLI_PATH, model: config.LLM_MODEL });

try {
  const categories = await db.category.findMany({ include: { parent: true } });
  const options = categories.map((row) => ({
    key: row.key,
    title: row.parent ? `${row.parent.name} → ${row.name}` : row.name,
  }));

  const started = Date.now();
  const extracted = await extractReceipt(
    llm,
    receiptTextFromHtml(readFileSync(file, 'utf8')),
    options,
  );
  console.log(`Модель ${llm.name} ответила за ${Date.now() - started} мс:`);
  console.log(JSON.stringify(extracted, null, 2));
  console.log('Проверка:', checkReceipt(extracted));
} finally {
  await db.$disconnect();
}
