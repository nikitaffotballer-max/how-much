import { dashboardSummarySchema } from '@how-much/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from '../auth/session.js';
import { buildTestApp, deleteTestUsers, registerTestUser } from '../test/testApp.js';

const app = await buildTestApp();

beforeAll(() => app.ready());
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

function getSummary(token?: string) {
  return app.inject({
    method: 'GET',
    url: '/api/v1/analytics/summary',
    cookies: token ? { [SESSION_COOKIE]: token } : {},
  });
}

describe('GET /api/v1/analytics/summary', () => {
  it('без входа — 401', async () => {
    expect((await getSummary()).statusCode).toBe(401);
  });

  it('у нового пользователя — нули, а не ошибка', async () => {
    const { token } = await registerTestUser(app);
    const summary = dashboardSummarySchema.parse((await getSummary(token)).json());

    expect(summary).toMatchObject({ total: 0, receiptsCount: 0, averageReceipt: 0 });
    expect(summary.byCategory).toEqual([]);
    expect(summary.byDay.every((day) => day.total === 0)).toBe(true);
  });

  it('считает свои чеки по категориям и не видит чужие', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    const dairy = await app.db.category.findUniqueOrThrow({ where: { key: 'groceries.dairy' } });

    const purchasedAt = new Date();
    await app.db.receipt.create({
      data: {
        userId: me.id,
        purchasedAt,
        source: 'manual',
        // Итог больше суммы строк (например, пакет без строки) — разница уходит в главную категорию.
        totalKopecks: 30_000,
        items: {
          create: [
            {
              position: 0,
              rawName: 'МОЛОКО',
              quantity: 2,
              priceKopecks: 12_000,
              sumKopecks: 24_000,
              categoryId: dairy.id,
            },
            {
              position: 1,
              rawName: 'БЕЗ КАТЕГОРИИ',
              quantity: 1,
              priceKopecks: 5_000,
              sumKopecks: 5_000,
            },
          ],
        },
      },
    });
    await app.db.receipt.create({
      data: { userId: stranger.id, purchasedAt, source: 'manual', totalKopecks: 99_900 },
    });

    const summary = dashboardSummarySchema.parse((await getSummary(me.token)).json());

    expect(summary.total).toBe(30_000);
    expect(summary.receiptsCount).toBe(1);
    expect(summary.byCategory).toEqual(
      expect.arrayContaining([
        { category: 'groceries', total: 25_000 },
        { category: 'other', total: 5_000 },
      ]),
    );
    expect(summary.byDay.reduce((sum, day) => sum + day.total, 0)).toBe(30_000);
    expect(summary.recent).toHaveLength(1);
    expect(summary.recent[0]).toMatchObject({ category: 'groceries', total: 30_000 });
  });
});
