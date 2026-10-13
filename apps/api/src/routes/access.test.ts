import { receiptListSchema } from '@how-much/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from '../auth/session.js';
import { buildTestApp, deleteTestUsers, registerTestUser } from '../test/testApp.js';

const app = await buildTestApp();

beforeAll(() => app.ready());
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

/** Пользователь, у которого закончился пробный Pro. */
async function freeUser() {
  const user = await registerTestUser(app);
  await app.db.subscription.update({ where: { userId: user.id }, data: { status: 'expired' } });
  return user;
}

function get(token: string, url: string) {
  return app.inject({ method: 'GET', url, cookies: { [SESSION_COOKIE]: token } });
}

describe('Pro-функции', () => {
  it('на Free дашборд за неделю — 402 с кодом функции', async () => {
    const { token } = await freeUser();
    const response = await get(token, '/api/v1/analytics/summary?period=week');

    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({
      code: 'pro_required',
      details: { feature: 'dashboardPeriods' },
    });
  });

  it('на Free текущий месяц доступен', async () => {
    const { token } = await freeUser();
    expect((await get(token, '/api/v1/analytics/summary')).statusCode).toBe(200);
  });

  it('в пробном Pro доступны любые периоды', async () => {
    const { token } = await registerTestUser(app);
    expect((await get(token, '/api/v1/analytics/summary?period=week')).statusCode).toBe(200);
  });
});

describe('История на Free', () => {
  it('список чеков показывает только последние 3 месяца, старые не удаляет', async () => {
    const user = await freeUser();
    const old = new Date();
    old.setMonth(old.getMonth() - 4);
    await app.db.receipt.createMany({
      data: [
        { userId: user.id, purchasedAt: new Date(), source: 'cash', totalKopecks: 10_000 },
        { userId: user.id, purchasedAt: old, source: 'cash', totalKopecks: 20_000 },
      ],
    });

    const list = receiptListSchema.parse((await get(user.token, '/api/v1/receipts')).json());

    expect(list.items.map((item) => item.total)).toEqual([10_000]);
    expect(await app.db.receipt.count({ where: { userId: user.id } })).toBe(2);
  });
});
