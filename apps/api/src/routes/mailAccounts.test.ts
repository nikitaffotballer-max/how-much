import { decryptSecret, HCMailAuthError, HCMailConnectionError } from '@how-much/mail';
import { mailAccountListSchema, mailAccountSchema } from '@how-much/shared';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from '../auth/session.js';
import {
  buildTestApp,
  createFakeMailGateway,
  deleteTestUsers,
  registerTestUser,
} from '../test/testApp.js';

const mail = createFakeMailGateway();
const app = await buildTestApp({}, { mail });

beforeAll(() => app.ready());
afterEach(() => {
  mail.verifyError = null;
});
afterAll(async () => {
  await deleteTestUsers(app);
  await app.close();
});

const auth = (token: string) => ({ cookies: { [SESSION_COOKIE]: token } });

function connect(token: string, payload: Record<string, string> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/mail-accounts',
    payload: {
      provider: 'yandex',
      login: 'me@yandex.ru',
      appPassword: 'abcdefghijklmnop',
      ...payload,
    },
    ...auth(token),
  });
}

async function list(token: string) {
  const res = await app.inject({ method: 'GET', url: '/api/v1/mail-accounts', ...auth(token) });
  return mailAccountListSchema.parse(res.json());
}

describe('/api/v1/mail-accounts', () => {
  it('без входа — 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/mail-accounts' });
    expect(res.statusCode).toBe(401);
  });

  it('подключает ящик, хранит пароль зашифрованным и ставит синхронизацию', async () => {
    const { token } = await registerTestUser(app);
    const res = await connect(token, {
      login: ' Me@Yandex.ru ',
      appPassword: 'abcd efgh ijkl mnop',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).not.toContain('abcd');
    const account = mailAccountSchema.parse(res.json());
    expect(account).toMatchObject({
      provider: 'yandex',
      login: 'me@yandex.ru',
      status: 'active',
      lastSyncAt: null,
      emailsFound: 0,
    });

    const row = await app.db.mailAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(row.encryptedPassword).not.toContain('abcdefghijklmnop');
    expect(decryptSecret(row.encryptedPassword, app.hcConfig.MAIL_ENCRYPTION_KEY)).toBe(
      'abcdefghijklmnop',
    );
    expect(mail.syncRequests).toContain(account.id);
    expect(await list(token)).toEqual([account]);
  });

  it('не подключает один ящик дважды', async () => {
    const { token } = await registerTestUser(app);
    expect((await connect(token)).statusCode).toBe(201);
    const res = await connect(token);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'mail_account_exists' });
  });

  it('на Free разрешает только один ящик', async () => {
    const { id, token } = await registerTestUser(app);
    await app.db.subscription.update({ where: { userId: id }, data: { status: 'expired' } });

    expect((await connect(token, { login: 'first@yandex.ru' })).statusCode).toBe(201);
    const res = await connect(token, { login: 'second@yandex.ru' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'mail_accounts_limit' });
  });

  it('неверный пароль приложения — 422, недоступный сервер — 502, ничего не сохраняется', async () => {
    const { token } = await registerTestUser(app);

    mail.verifyError = new HCMailAuthError('нет');
    expect((await connect(token)).json()).toMatchObject({ code: 'mail_auth_failed' });

    mail.verifyError = new HCMailConnectionError('нет');
    const res = await connect(token);
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ code: 'mail_unreachable' });

    expect(await list(token)).toEqual([]);
  });

  it('проверяет данные формы', async () => {
    const { token } = await registerTestUser(app);
    const res = await connect(token, { provider: 'rambler', appPassword: '  ' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'validation_error' });
  });

  it('«Обновить сейчас» — не чаще раза в минуту', async () => {
    const { token } = await registerTestUser(app);
    const { id } = mailAccountSchema.parse((await connect(token)).json());
    const sync = () =>
      app.inject({ method: 'POST', url: `/api/v1/mail-accounts/${id}/sync`, ...auth(token) });

    expect((await sync()).statusCode).toBe(202);
    const limited = await sync();
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({ code: 'rate_limited' });
  });

  it('удаляет свой ящик и не трогает чужие', async () => {
    const me = await registerTestUser(app);
    const stranger = await registerTestUser(app);
    const { id } = mailAccountSchema.parse((await connect(stranger.token)).json());

    expect(await list(me.token)).toEqual([]);
    for (const [method, url] of [
      ['DELETE', `/api/v1/mail-accounts/${id}`],
      ['POST', `/api/v1/mail-accounts/${id}/sync`],
    ] as const) {
      const res = await app.inject({ method, url, ...auth(me.token) });
      expect(res.statusCode).toBe(404);
    }

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/mail-accounts/${id}`,
      ...auth(stranger.token),
    });
    expect(res.statusCode).toBe(204);
    expect(await list(stranger.token)).toEqual([]);
  });
});
