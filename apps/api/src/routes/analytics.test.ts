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

function getSummary(token?: string, query = '') {
  return app.inject({
    method: 'GET',
    url: `/api/v1/analytics/summary${query}`,
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

  it('считает произвольный период и топ магазинов', async () => {
    const me = await registerTestUser(app);
    const merchant = await app.db.merchant.create({
      data: { name: 'ООО «ТЕСТ»', displayName: 'Тестовый магазин' },
    });
    const receipt = (purchasedAt: string, totalKopecks: number, merchantId?: string) =>
      app.db.receipt.create({
        data: {
          userId: me.id,
          purchasedAt: new Date(purchasedAt),
          source: 'manual',
          totalKopecks,
          merchantId,
        },
      });
    // 1–3 сентября по Москве и такие же 3 дня перед ними (29–31 августа).
    await receipt('2026-09-01T10:00:00+03:00', 10_000, merchant.id);
    await receipt('2026-09-03T23:30:00+03:00', 5_000, merchant.id);
    await receipt('2026-09-02T12:00:00+03:00', 2_000);
    await receipt('2026-08-30T12:00:00+03:00', 7_000);
    await receipt('2026-09-04T00:30:00+03:00', 99_000);

    try {
      const response = await getSummary(me.token, '?period=custom&from=2026-09-01&to=2026-09-03');
      const summary = dashboardSummarySchema.parse(response.json());

      expect(summary.period).toEqual({ kind: 'custom', from: '2026-09-01', to: '2026-09-03' });
      expect(summary.previousPeriod).toEqual({ from: '2026-08-29', to: '2026-08-31' });
      expect(summary.total).toBe(17_000);
      expect(summary.previousTotal).toBe(7_000);
      expect(summary.byDay.map((day) => day.total)).toEqual([10_000, 2_000, 5_000]);
      expect(summary.topMerchants).toEqual([
        { name: 'Тестовый магазин', total: 15_000, receiptsCount: 2 },
      ]);
    } finally {
      await app.db.receipt.deleteMany({ where: { merchantId: merchant.id } });
      await app.db.merchant.delete({ where: { id: merchant.id } });
    }
  });

  it('отклоняет перевёрнутый и слишком длинный период', async () => {
    const { token } = await registerTestUser(app);
    const reversed = await getSummary(token, '?period=custom&from=2026-09-10&to=2026-09-01');
    const tooLong = await getSummary(token, '?period=custom&from=2025-01-01&to=2026-09-01');
    const unknown = await getSummary(token, '?period=year');

    expect(reversed.statusCode).toBe(400);
    expect(tooLong.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(400);
  });
});
