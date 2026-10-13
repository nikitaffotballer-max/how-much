import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from './test/testApp.js';

const app = await buildTestApp();

beforeAll(() => app.ready());
afterAll(() => app.close());

describe('API', () => {
  it('GET /api/v1/health отвечает ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('неизвестный маршрут — 404 в едином формате ошибок', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'not_found' });
  });
});
