import { ImapFlow } from 'imapflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  fetchReceiptEmails,
  type FolderCursors,
  HCMailAuthError,
  HCMailConnectionError,
  verifyMailLogin,
  type MailCredentials,
  type ReceiptEmail,
} from './imap.js';

/**
 * Проверка на настоящем IMAP-сервере Dovecot из docker-compose (профиль test).
 * Запуск: docker compose --profile test up -d, затем IMAP_TEST_PORT=31993 pnpm test.
 * Без переменной тесты пропускаются — обычному прогону сервер не нужен.
 */
const port = Number(process.env.IMAP_TEST_PORT);
const server = { host: '127.0.0.1', port, allowSelfSignedCert: true };
const credentials: MailCredentials = { login: 'receipts@how-much.local', password: 'app-password' };

function rawEmail(from: string, subject: string, date: Date) {
  return [
    `From: ${from}`,
    'To: receipts@how-much.local',
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${Math.random().toString(36).slice(2)}@test>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    `<p>${from}</p>`,
  ].join('\r\n');
}

async function collect(emails: AsyncGenerator<ReceiptEmail>) {
  const result: ReceiptEmail[] = [];
  for await (const email of emails) result.push(email);
  return result;
}

describe.skipIf(!port)('IMAP на тестовом сервере', () => {
  const admin = new ImapFlow({
    host: server.host,
    port,
    secure: true,
    tls: { rejectUnauthorized: false },
    auth: { user: credentials.login, pass: credentials.password },
    logger: false,
  });
  const now = new Date();

  beforeAll(async () => {
    await admin.connect();
    const lock = await admin.getMailboxLock('INBOX');
    try {
      await admin.messageDelete('1:*').catch(() => undefined);
    } finally {
      lock.release();
    }
    await admin.append('INBOX', rawEmail('noreply@ofd.ru', 'Кассовый чек', now));
    await admin.append('INBOX', rawEmail('news@ozon.ru', 'Распродажа', now));
    await admin.append('INBOX', rawEmail('friend@gmail.com', 'Чек за ужин', now));
    // Как у Mail.ru: почта сама раскладывает чеки в отдельную папку.
    await admin.mailboxCreate('Receipts').catch(() => undefined);
    await admin.append('Receipts', rawEmail('noreply@chek.pofd.ru', 'Чек и подарок', now));
  });

  afterAll(() => admin.logout());

  it('проверка входа отличает неверный пароль от недоступного сервера', async () => {
    await expect(verifyMailLogin(server, credentials)).resolves.toBeUndefined();
    await expect(
      verifyMailLogin(server, { ...credentials, password: 'wrong' }),
    ).rejects.toBeInstanceOf(HCMailAuthError);
    await expect(verifyMailLogin({ ...server, port: 1 }, credentials)).rejects.toBeInstanceOf(
      HCMailConnectionError,
    );
  });

  it('забирает только чеки из всех папок и не помечает их прочитанными', async () => {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const emails = await collect(fetchReceiptEmails(server, credentials, { cursors: {}, since }));

    expect(emails.map((email) => [email.folder, email.fromAddress, email.subject])).toEqual([
      ['INBOX', 'noreply@ofd.ru', 'Кассовый чек'],
      ['Receipts', 'noreply@chek.pofd.ru', 'Чек и подарок'],
    ]);
    expect(emails[0]?.html).toContain('noreply@ofd.ru');

    const lock = await admin.getMailboxLock('INBOX');
    try {
      expect(await admin.search({ seen: true })).toEqual([]);
    } finally {
      lock.release();
    }
  });

  it('при повторной синхронизации берёт только новые письма', async () => {
    const since = new Date(0);
    const cursors: FolderCursors = {};
    for (const email of await collect(
      fetchReceiptEmails(server, credentials, { cursors, since }),
    )) {
      cursors[email.folder] = { uidValidity: email.uidValidity, lastUid: email.uid };
    }

    expect(await collect(fetchReceiptEmails(server, credentials, { cursors, since }))).toEqual([]);

    await admin.append('INBOX', rawEmail('echeck@1-ofd.ru', 'Чек', new Date()));
    const fresh = await collect(fetchReceiptEmails(server, credentials, { cursors, since }));
    expect(fresh.map((email) => email.fromAddress)).toEqual(['echeck@1-ofd.ru']);
  });
});
