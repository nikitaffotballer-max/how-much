import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../app.js';
import { SESSION_COOKIE } from '../auth/session.js';
import { loadConfig } from '../config.js';

/** Все тестовые пользователи живут в этом домене — так их легко удалить после тестов. */
export const TEST_EMAIL_DOMAIN = 'test.how-much.local';
export const TEST_PASSWORD = 'correct-horse-battery';

export function uniqueTestEmail(): string {
  return `user-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

export function buildTestApp(env: Record<string, string> = {}) {
  return buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', ...env }));
}

export async function deleteTestUsers(app: FastifyInstance) {
  await app.db.user.deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } });
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
  if (!cookie) throw new Error('Сервер не выставил cookie сессии');
  return cookie.value;
}

/** Регистрирует нового пользователя и возвращает его id и токен сессии. */
export async function registerTestUser(app: FastifyInstance, email = uniqueTestEmail()) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: TEST_PASSWORD },
  });
  return { id: (res.json() as { id: string }).id, email, token: sessionCookie(res) };
}
