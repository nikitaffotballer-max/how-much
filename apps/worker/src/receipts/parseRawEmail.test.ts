import { createPrismaClient } from '@how-much/db';
import type { LlmProvider, LlmRequest } from '@how-much/llm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import type { ExtractedReceipt } from './extractReceipt.js';
import { EXTRACTED_RECEIPT } from './fixtures/extractedReceipt.js';
import { parseRawEmail } from './parseRawEmail.js';

// Свой домен: тесты API идут параллельно и удаляют пользователей @test.how-much.local.
const TEST_EMAIL_DOMAIN = 'worker.test.how-much.local';
const db = createPrismaClient(process.env.DATABASE_URL ?? '');
const html = readFileSync(new URL('./fixtures/ofd-receipt.html', import.meta.url), 'utf8');

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } });
  await db.$disconnect();
});

/** Модель-заглушка: возвращает заданный ответ и запоминает запросы. */
function fakeLlm(answer: ExtractedReceipt) {
  const requests: LlmRequest<z.ZodType>[] = [];
  const llm: LlmProvider = {
    name: 'fake',
    async generate(request) {
      requests.push(request);
      return request.schema.parse(answer);
    },
  };
  return { llm, requests };
}

async function createRawEmail(userId?: string) {
  const user = userId
    ? { id: userId }
    : await db.user.create({
        data: { email: `parse-${randomUUID()}@${TEST_EMAIL_DOMAIN}`, passwordHash: 'not-used' },
      });
  const account = await db.mailAccount.upsert({
    where: { userId_login: { userId: user.id, login: 'me@yandex.ru' } },
    update: {},
    create: { userId: user.id, provider: 'yandex', login: 'me@yandex.ru', encryptedPassword: 'x' },
  });
  return db.rawEmail.create({
    data: {
      mailAccountId: account.id,
      messageId: `<${randomUUID()}@ofd.ru>`,
      fromAddress: 'noreply@ofd.ru',
      subject: 'Кассовый чек',
      receivedAt: new Date(),
      html,
      deleteAfter: new Date(Date.now() + 86_400_000),
    },
  });
}

describe('parseRawEmail', () => {
  it('сохраняет чек с позициями и категориями, отмечает письмо разобранным', async () => {
    const raw = await createRawEmail();
    const { llm, requests } = fakeLlm(EXTRACTED_RECEIPT);

    expect(await parseRawEmail({ db, llm }, raw.id)).toBe('parsed');

    const receipt = await db.receipt.findUniqueOrThrow({
      where: { rawEmailId: raw.id },
      include: {
        merchant: true,
        items: { include: { category: true }, orderBy: { position: 'asc' } },
      },
    });
    expect(receipt).toMatchObject({
      totalKopecks: 60652,
      source: 'email',
      fn: '7380440700123456',
      fd: '48213',
      merchant: { displayName: 'Пятёрочка', inn: '7825706086' },
    });
    expect(
      receipt.items.map((item) => [item.rawName, item.sumKopecks, item.category?.key]),
    ).toEqual([
      ['Молоко 930 мл', 17998, 'groceries.dairy'],
      ['Хлеб Бородинский', 5490, 'groceries.bread'],
      ['Бананы', 17264, 'groceries.produce'],
      ['Fairy 450 мл', 19900, 'home.cleaning'],
    ]);
    expect(await db.rawEmail.findUniqueOrThrow({ where: { id: raw.id } })).toMatchObject({
      parseStatus: 'parsed',
    });

    // Модель получает текст чека без личных данных и список категорий.
    const [request] = requests;
    expect(request?.prompt).toContain('Молоко Простоквашино');
    expect(request?.prompt).not.toContain('buyer@example.com');
    expect(request?.system).toContain('groceries.dairy');
  });

  it('второе письмо с тем же чеком не создаёт дубль', async () => {
    const first = await createRawEmail();
    const user = await db.mailAccount.findUniqueOrThrow({ where: { id: first.mailAccountId } });
    const second = await createRawEmail(user.userId);
    const answer = { ...EXTRACTED_RECEIPT, fd: '777' };

    expect(await parseRawEmail({ db, llm: fakeLlm(answer).llm }, first.id)).toBe('parsed');
    expect(await parseRawEmail({ db, llm: fakeLlm(answer).llm }, second.id)).toBe('duplicate');
    expect(await db.receipt.count({ where: { userId: user.userId } })).toBe(1);
  });

  it('письмо без чека помечает как ненужное', async () => {
    const raw = await createRawEmail();
    const answer = { ...EXTRACTED_RECEIPT, isReceipt: false, items: [] };

    expect(await parseRawEmail({ db, llm: fakeLlm(answer).llm }, raw.id)).toBe('ignored');
    expect(await db.receipt.count({ where: { rawEmailId: raw.id } })).toBe(0);
  });

  it('если суммы не сходятся — письмо уходит в «Требуют внимания» с причиной', async () => {
    const raw = await createRawEmail();
    const answer = { ...EXTRACTED_RECEIPT, total: 999 };

    expect(await parseRawEmail({ db, llm: fakeLlm(answer).llm }, raw.id)).toBe('failed');
    expect(await db.rawEmail.findUniqueOrThrow({ where: { id: raw.id } })).toMatchObject({
      parseStatus: 'failed',
      parseError: expect.stringContaining('не сходится'),
    });
  });

  it('разобранное письмо повторно не трогает', async () => {
    const raw = await createRawEmail();
    const { llm, requests } = fakeLlm(EXTRACTED_RECEIPT);
    await parseRawEmail({ db, llm }, raw.id);

    expect(await parseRawEmail({ db, llm }, raw.id)).toBe('skipped');
    expect(requests).toHaveLength(1);
  });
});
