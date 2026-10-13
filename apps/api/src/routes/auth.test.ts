import { currentUserSchema } from '@how-much/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from '../auth/session.js';
import {
  buildTestApp,
  deleteTestUsers,
  registerTestUser,
  sessionCookie,
  TEST_PASSWORD,
  uniqueTestEmail,
} from '../test/testApp.js';

const app = await buildTestApp();

beforeAll(() => app.ready());
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

function register(email: string, password = TEST_PASSWORD) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password } });
}

function login(email: string, password = TEST_PASSWORD) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
}

function me(token?: string) {
  return app.inject({
    method: 'GET',
    url: '/api/v1/me',
    cookies: token ? { [SESSION_COOKIE]: token } : {},
  });
}

describe('регистрация', () => {
  it('создаёт пользователя с пробным Pro и сразу открывает сессию', async () => {
    const res = await register(uniqueTestEmail());

    expect(res.statusCode).toBe(201);
    const user = currentUserSchema.parse(res.json());
    expect(user).toMatchObject({ plan: 'pro', subscriptionStatus: 'trialing' });

    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
  });

  it('не даёт зарегистрировать email дважды, даже в другом регистре', async () => {
    const email = uniqueTestEmail();
    await register(email);

    const res = await register(email.toUpperCase());
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'email_taken' });
  });

  it.each([
    ['неверный email', 'not-an-email', TEST_PASSWORD],
    ['короткий пароль', uniqueTestEmail(), '1234567'],
  ])('отклоняет %s', async (_case, email, password) => {
    const res = await register(email, password);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'validation_error' });
  });
});

describe('вход и выход', () => {
  it('пускает с верным паролем и показывает профиль', async () => {
    const { email } = await registerTestUser(app);

    const res = await login(email);
    expect(res.statusCode).toBe(200);

    const profile = await me(sessionCookie(res));
    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({ email });
  });

  it('одинаково отвечает на неверный пароль и несуществующий email', async () => {
    const { email } = await registerTestUser(app);

    const wrongPassword = await login(email, 'wrong-password');
    const unknownEmail = await login(uniqueTestEmail());

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ code: 'invalid_credentials' });
    }
  });

  it('без сессии профиль недоступен', async () => {
    expect((await me()).statusCode).toBe(401);
  });

  it('после выхода старая cookie больше не работает', async () => {
    const { token } = await registerTestUser(app);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { [SESSION_COOKIE]: token },
    });
    expect(logout.statusCode).toBe(204);
    expect((await me(token)).statusCode).toBe(401);
  });
});

describe('демо-вход', () => {
  it('если демо-пользователя нет в базе — 404', async () => {
    const demoApp = await buildTestApp({ DEMO_EMAIL: uniqueTestEmail() });
    try {
      const res = await demoApp.inject({ method: 'POST', url: '/api/v1/auth/demo' });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ code: 'demo_unavailable' });
    } finally {
      await demoApp.close();
    }
  });

  it('пускает в демо-аккаунт без пароля', async () => {
    const demo = await registerTestUser(app);
    const demoApp = await buildTestApp({ DEMO_EMAIL: demo.email });
    try {
      const res = await demoApp.inject({ method: 'POST', url: '/api/v1/auth/demo' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ email: demo.email });
      expect(sessionCookie(res)).toBeTruthy();
    } finally {
      await demoApp.close();
    }
  });
});
