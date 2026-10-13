import {
  attentionEmailListSchema,
  categoryListSchema,
  receiptDetailSchema,
  receiptItemSchema,
  receiptListSchema,
} from '@how-much/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from '../auth/session.js';
import {
  buildTestApp,
  createFakeMailGateway,
  deleteTestUsers,
  registerTestUser,
} from '../test/testApp.js';

const mail = createFakeMailGateway();
const app = await buildTestApp({}, { mail });

beforeAll(() => app.ready());
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

const auth = (token: string) => ({ cookies: { [SESSION_COOKIE]: token } });

async function categoryId(key: string) {
  return (await app.db.category.findUniqueOrThrow({ where: { key } })).id;
}

/** Чек с одной позицией: удобно проверять поиск и фильтры. */
async function createReceipt(
  userId: string,
  { item, categoryKey, minutesAgo }: { item: string; categoryKey: string; minutesAgo: number },
) {
  return app.db.receipt.create({
    data: {
      userId,
      purchasedAt: new Date(Date.now() - minutesAgo * 60_000),
      source: 'email',
      totalKopecks: 10_000,
      fn: '7380440700123456',
      fd: String(minutesAgo),
      items: {
        create: {
          position: 0,
          rawName: item,
          quantity: 1,
          priceKopecks: 10_000,
          sumKopecks: 10_000,
          categoryId: await categoryId(categoryKey),
          categorySource: 'llm',
        },
      },
    },
    include: { items: true },
  });
}

async function listReceipts(token: string, query = '') {
  const res = await app.inject({ method: 'GET', url: `/api/v1/receipts${query}`, ...auth(token) });
  expect(res.statusCode).toBe(200);
  return receiptListSchema.parse(res.json());
}

describe('GET /api/v1/receipts', () => {
  it('отдаёт свои чеки от новых к старым, ищет по товару и фильтрует по категории', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    await createReceipt(me.id, {
      item: 'Молоко 2,5%',
      categoryKey: 'groceries.dairy',
      minutesAgo: 30,
    });
    await createReceipt(me.id, { item: 'Fairy', categoryKey: 'home.cleaning', minutesAgo: 10 });
    await createReceipt(stranger.id, {
      item: 'Молоко',
      categoryKey: 'groceries.dairy',
      minutesAgo: 5,
    });

    const all = await listReceipts(me.token);
    expect(all.items.map((r) => r.itemsPreview)).toEqual(['fairy', 'молоко 2,5%']);
    expect(all.items.map((r) => r.category)).toEqual(['home', 'groceries']);

    expect((await listReceipts(me.token, '?q=МОЛОКО')).items).toHaveLength(1);
    const groceries = await listReceipts(me.token, '?category=groceries');
    expect(groceries.items.map((r) => r.itemsPreview)).toEqual(['молоко 2,5%']);
  });

  it('листает страницами без повторов и пропусков', async () => {
    const me = await registerTestUser(app);
    for (const minutesAgo of [1, 2, 3, 4, 5]) {
      await createReceipt(me.id, { item: `Товар ${minutesAgo}`, categoryKey: 'other', minutesAgo });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof listReceipts>> = await listReceipts(
        me.token,
        `?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
      );
      seen.push(...page.items.map((r) => r.itemsPreview));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toEqual(['товар 1', 'товар 2', 'товар 3', 'товар 4', 'товар 5']);
  });
});

describe('GET /api/v1/receipts/:id', () => {
  it('показывает позиции с категориями и не открывает чужой чек', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    const receipt = await createReceipt(me.id, {
      item: 'Кефир',
      categoryKey: 'groceries.dairy',
      minutesAgo: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/receipts/${receipt.id}`,
      ...auth(me.token),
    });
    const detail = receiptDetailSchema.parse(res.json());
    expect(detail.items).toEqual([
      expect.objectContaining({
        name: 'Кефир',
        quantity: 1,
        category: { key: 'groceries.dairy', name: 'Молочное', topKey: 'groceries' },
        categorySource: 'llm',
      }),
    ]);
    expect(detail.fiscal).toEqual({ fn: '7380440700123456', fd: '1', fpd: null });

    const foreign = await app.inject({
      method: 'GET',
      url: `/api/v1/receipts/${receipt.id}`,
      ...auth(stranger.token),
    });
    expect(foreign.statusCode).toBe(404);
  });
});

describe('PATCH /api/v1/receipt-items/:id', () => {
  it('меняет категорию позиции и запоминает, что её выбрал пользователь', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    const receipt = await createReceipt(me.id, {
      item: 'Сыр',
      categoryKey: 'other',
      minutesAgo: 1,
    });
    const itemId = receipt.items[0]!.id;
    const patch = (token: string, categoryKey: string) =>
      app.inject({
        method: 'PATCH',
        url: `/api/v1/receipt-items/${itemId}`,
        payload: { categoryKey },
        ...auth(token),
      });

    expect((await patch(stranger.token, 'groceries.dairy')).statusCode).toBe(404);
    expect((await patch(me.token, 'no-such-category')).statusCode).toBe(400);

    const item = receiptItemSchema.parse((await patch(me.token, 'groceries.dairy')).json());
    expect(item).toMatchObject({ category: { key: 'groceries.dairy' }, categorySource: 'user' });
  });

  it('справочник категорий содержит оба уровня', async () => {
    const me = await registerTestUser(app);
    const res = await app.inject({ method: 'GET', url: '/api/v1/categories', ...auth(me.token) });
    const categories = categoryListSchema.parse(res.json());
    expect(categories).toContainEqual({
      key: 'groceries.dairy',
      name: 'Молочное',
      topKey: 'groceries',
      parentKey: 'groceries',
    });
  });
});

describe('Требуют внимания', () => {
  async function createFailedEmail(userId: string) {
    const account = await app.db.mailAccount.create({
      data: { userId, provider: 'yandex', login: `${userId}@yandex.ru`, encryptedPassword: 'x' },
    });
    return app.db.rawEmail.create({
      data: {
        mailAccountId: account.id,
        messageId: `<${userId}@ofd.ru>`,
        fromAddress: 'noreply@ofd.ru',
        subject: 'Кассовый чек',
        receivedAt: new Date(),
        html: '<p>чек</p>',
        parseStatus: 'failed',
        parseError: 'Сумма позиций не сходится с итогом',
        deleteAfter: new Date(Date.now() + 86_400_000),
      },
    });
  }

  it('показывает неразобранные письма, повторяет разбор и скрывает «не чек»', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    const first = await createFailedEmail(me.id);

    const list = async (token: string) =>
      attentionEmailListSchema.parse(
        (
          await app.inject({ method: 'GET', url: '/api/v1/receipts/attention', ...auth(token) })
        ).json(),
      );
    expect(await list(me.token)).toEqual([
      expect.objectContaining({ id: first.id, reason: 'Сумма позиций не сходится с итогом' }),
    ]);
    expect(await list(stranger.token)).toEqual([]);

    const action = (token: string, id: string, name: 'retry' | 'dismiss') =>
      app.inject({
        method: 'POST',
        url: `/api/v1/receipts/attention/${id}/${name}`,
        ...auth(token),
      });

    expect((await action(stranger.token, first.id, 'retry')).statusCode).toBe(404);
    expect((await action(me.token, first.id, 'retry')).statusCode).toBe(202);
    expect(mail.parseRequests).toContain(first.id);
    expect(await app.db.rawEmail.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({
      parseStatus: 'pending',
      parseError: null,
    });

    await app.db.rawEmail.update({ where: { id: first.id }, data: { parseStatus: 'failed' } });
    expect((await action(me.token, first.id, 'dismiss')).statusCode).toBe(204);
    expect(await list(me.token)).toEqual([]);
  });
});
