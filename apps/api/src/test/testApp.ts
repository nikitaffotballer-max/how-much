import { randomUUID } from 'node:crypto';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

/** Все тестовые пользователи живут в этом домене — так их легко удалить после тестов. */
export const TEST_EMAIL_DOMAIN = 'test.how-much.local';

export function uniqueTestEmail(): string {
  return `user-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

export function buildTestApp() {
  return buildApp(loadConfig({ ...process.env, NODE_ENV: 'test' }));
}
