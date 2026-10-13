import { dashboardSummarySchema } from '@how-much/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const app = await buildApp(loadConfig({ NODE_ENV: 'test' }));

beforeAll(() => app.ready());
afterAll(() => app.close());

describe('API', () => {
  it('GET /api/v1/health отвечает ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/analytics/summary отдаёт сводку по схеме', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/summary' });
    expect(res.statusCode).toBe(200);
    const summary = dashboardSummarySchema.parse(res.json());
    const categoriesSum = summary.byCategory.reduce((sum, c) => sum + c.total, 0);
    expect(categoriesSum).toBe(summary.total);
  });

  it('неизвестный маршрут — 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
  });
});
