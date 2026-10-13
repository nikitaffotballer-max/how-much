/**
 * Обзор подключённого ящика: кто присылает письма со словом «чек» и в каких папках они лежат.
 * Читает только заголовки. Запуск: pnpm --filter @how-much/worker mail:survey <адрес>
 */
import { createPrismaClient } from '@how-much/db';
import { decryptSecret, surveyReceiptSenders } from '@how-much/mail';
import { HC_MAIL_PROVIDERS, HC_PLAN_LIMITS } from '@how-much/shared';
import { loadConfig } from '../config.js';

const login = process.argv[2];
if (!login) {
  console.error('Укажите адрес ящика: pnpm --filter @how-much/worker mail:survey you@mail.ru');
  process.exit(1);
}

const config = loadConfig();
const db = createPrismaClient(config.DATABASE_URL);
try {
  const account = await db.mailAccount.findFirst({ where: { login } });
  if (!account) throw new Error(`Ящик ${login} не подключён`);

  const since = new Date();
  since.setMonth(since.getMonth() - HC_PLAN_LIMITS.pro.importMonths);
  const rows = await surveyReceiptSenders(
    HC_MAIL_PROVIDERS[account.provider].imap,
    { login, password: decryptSecret(account.encryptedPassword, config.MAIL_ENCRYPTION_KEY) },
    since,
  );
  console.table(
    rows.map((row) => ({
      папка: row.folder,
      домен: row.domain,
      писем: row.count,
      забираем: row.taken,
      'пример темы': row.sampleSubject.slice(0, 60),
    })),
  );
} finally {
  await db.$disconnect();
}
