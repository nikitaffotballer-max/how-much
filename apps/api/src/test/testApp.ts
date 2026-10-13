import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { randomBytes, randomUUID } from 'node:crypto';
import { buildApp, type AppDeps } from '../app.js';
import { SESSION_COOKIE } from '../auth/session.js';
import { loadConfig } from '../config.js';
import type { MailGateway } from '../mail/mailGateway.js';

/** Все тестовые пользователи живут в этом домене — так их легко удалить после тестов. */
export const TEST_EMAIL_DOMAIN = 'test.how-much.local';
export const TEST_PASSWORD = 'correct-horse-battery';

export function uniqueTestEmail(): string {
  return `user-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

/** Почта без IMAP и Redis: запоминает, что у неё просили, и падает, если задать ошибку. */
export interface FakeMailGateway extends MailGateway {
  verifyError: Error | null;
  syncRequests: string[];
  parseRequests: string[];
}

export function createFakeMailGateway(): FakeMailGateway {
  const fake: FakeMailGateway = {
    verifyError: null,
    syncRequests: [],
    parseRequests: [],
    async verifyLogin() {
      if (fake.verifyError) throw fake.verifyError;
    },
    async enqueueSync(mailAccountId: string) {
      fake.syncRequests.push(mailAccountId);
    },
    async enqueueReceiptParse(rawEmailId: string) {
      fake.parseRequests.push(rawEmailId);
    },
    async close() {},
  };
  return fake;
}

export function buildTestApp(env: Record<string, string> = {}, deps: AppDeps = {}) {
  const config = loadConfig({
    ...process.env,
    NODE_ENV: 'test',
    // В CI нет .env: ключ шифрования генерируем на каждый прогон.
    MAIL_ENCRYPTION_KEY: process.env.MAIL_ENCRYPTION_KEY ?? randomBytes(32).toString('base64'),
    ...env,
  });
  return buildApp(config, {}, { mail: createFakeMailGateway(), ...deps });
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
