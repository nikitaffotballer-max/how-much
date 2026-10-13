import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSession, SESSION_COOKIE } from '../auth/session.js';
import { buildTestApp, deleteTestUsers, registerTestUser, TEST_PASSWORD } from '../test/testApp.js';

const app = await buildTestApp();

beforeAll(() => app.ready());
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

function me(token: string) {
  return app.inject({ method: 'GET', url: '/api/v1/me', cookies: { [SESSION_COOKIE]: token } });
}

function changePassword(token: string, currentPassword: string, newPassword: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/me/password',
    cookies: { [SESSION_COOKIE]: token },
    payload: { currentPassword, newPassword },
  });
}

function deleteAccount(token: string, password: string) {
  return app.inject({
    method: 'DELETE',
    url: '/api/v1/me',
    cookies: { [SESSION_COOKIE]: token },
    payload: { password },
  });
}

describe('POST /api/v1/me/password', () => {
  it('с неверным текущим паролем — 403, пароль не меняется', async () => {
    const user = await registerTestUser(app);
    const response = await changePassword(user.token, 'не-тот-пароль', 'новый-пароль-123');

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'wrong_password' });
  });

  it('меняет пароль и закрывает другие сессии, текущую оставляет', async () => {
    const user = await registerTestUser(app);
    const otherDevice = await createSession(app.db, user.id, 'другой телефон');

    const response = await changePassword(user.token, TEST_PASSWORD, 'новый-пароль-123');
    expect(response.statusCode).toBe(204);

    expect((await me(user.token)).statusCode).toBe(200);
    expect((await me(otherDevice)).statusCode).toBe(401);

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: user.email, password: 'новый-пароль-123' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('короткий новый пароль — 400', async () => {
    const user = await registerTestUser(app);
    expect((await changePassword(user.token, TEST_PASSWORD, '123')).statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/me', () => {
  it('с неверным паролем ничего не удаляет', async () => {
    const user = await registerTestUser(app);

    expect((await deleteAccount(user.token, 'не-тот-пароль')).statusCode).toBe(403);
    expect((await me(user.token)).statusCode).toBe(200);
  });

  it('удаляет пользователя вместе с чеками и сессиями', async () => {
    const user = await registerTestUser(app);
    await app.db.receipt.create({
      data: { userId: user.id, purchasedAt: new Date(), source: 'cash', totalKopecks: 45_000 },
    });

    const response = await deleteAccount(user.token, TEST_PASSWORD);

    expect(response.statusCode).toBe(204);
    expect(await app.db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await app.db.receipt.count({ where: { userId: user.id } })).toBe(0);
    expect(await app.db.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await me(user.token)).statusCode).toBe(401);
  });
});
