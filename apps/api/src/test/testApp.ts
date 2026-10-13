import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { randomBytes, randomUUID } from 'node:crypto';
import { buildApp, type AppDeps } from '../app.js';
import { hashPassword } from '../auth/password.js';
import { createSession, SESSION_COOKIE } from '../auth/session.js';
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

/** argon2 медленный нарочно — хешируем тестовый пароль один раз на файл. */
let testPasswordHash: Promise<string> | undefined;

/**
 * Пользователь как после регистрации (с пробным Pro) и его сессия. Создаём прямо в базе:
 * у /auth/register лимит 10 попыток в минуту, а сама регистрация проверяется в auth.test.ts.
 */
export async function registerTestUser(app: FastifyInstance, email = uniqueTestEmail()) {
  testPasswordHash ??= hashPassword(TEST_PASSWORD);
  const user = await app.db.user.create({
    data: {
      email,
      passwordHash: await testPasswordHash,
      subscription: {
        create: {
          status: 'trialing',
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
  const token = await createSession(app.db, user.id, 'vitest');
  return { id: user.id, email, token };
}
