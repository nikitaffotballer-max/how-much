import { createPrismaClient } from '@how-much/db';
import { encryptSecret, HCMailAuthError, type ReceiptEmail } from '@how-much/mail';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { RAW_EMAIL_TTL_MS, syncMailAccount, type FetchEmails } from './syncMailAccount.js';

const TEST_EMAIL_DOMAIN = 'test.how-much.local';
const db = createPrismaClient(process.env.DATABASE_URL ?? '');
const encryptionKey = randomBytes(32);
const now = new Date('2026-10-13T12:00:00Z');

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } });
  await db.$disconnect();
});

async function createAccount(subscriptionStatus: 'trialing' | 'expired' = 'trialing') {
  const user = await db.user.create({
    data: {
      email: `worker-${randomUUID()}@${TEST_EMAIL_DOMAIN}`,
      passwordHash: 'not-used',
      subscription: { create: { status: subscriptionStatus, currentPeriodEnd: now } },
    },
  });
  return db.mailAccount.create({
    data: {
      userId: user.id,
      provider: 'yandex',
      login: 'me@yandex.ru',
      encryptedPassword: encryptSecret('app-password', encryptionKey),
    },
  });
}

function receiptEmail(uid: number): ReceiptEmail {
  return {
    uid,
    messageId: `<${uid}@ofd.ru>`,
    fromAddress: 'noreply@ofd.ru',
    subject: 'Кассовый чек',
    receivedAt: now,
    html: `<p>чек ${uid}</p>`,
  };
}

/** Почтовый ящик без сети: отдаёт заданные письма и запоминает, о чём его спросили. */
function fakeMailbox(emails: ReceiptEmail[]) {
  const calls: Parameters<FetchEmails>[] = [];
  const fetchEmails: FetchEmails = async function* (...args) {
    calls.push(args);
    const { afterUid } = args[2];
    yield* emails.filter((email) => afterUid === null || email.uid > afterUid);
  };
  return { calls, fetchEmails };
}

describe('syncMailAccount', () => {
  it('сохраняет письма, запоминает последний UID и время синхронизации', async () => {
    const account = await createAccount();
    const mailbox = fakeMailbox([receiptEmail(5), receiptEmail(9)]);

    const result = await syncMailAccount(
      { db, encryptionKey, now, fetchEmails: mailbox.fetchEmails },
      account.id,
    );

    expect(result).toEqual({ status: 'synced', saved: 2 });
    const [server, credentials, range] = mailbox.calls[0]!;
    expect(server.host).toBe('imap.yandex.ru');
    expect(credentials).toEqual({ login: 'me@yandex.ru', password: 'app-password' });
    // Пробный период — это Pro, а в Pro импорт за 12 месяцев.
    expect(range).toEqual({ afterUid: null, since: new Date('2025-10-13T12:00:00Z') });

    const saved = await db.mailAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: { rawEmails: { orderBy: { messageId: 'asc' } } },
    });
    expect(saved).toMatchObject({ lastUid: 9, lastSyncAt: now, status: 'active' });
    expect(saved.rawEmails.map((raw) => [raw.messageId, raw.parseStatus])).toEqual([
      ['<5@ofd.ru>', 'pending'],
      ['<9@ofd.ru>', 'pending'],
    ]);
    expect(saved.rawEmails[0]?.deleteAfter).toEqual(new Date(now.getTime() + RAW_EMAIL_TTL_MS));
  });

  it('продолжает с последнего UID и не дублирует письма после обрыва', async () => {
    const account = await createAccount();
    const deps = { db, encryptionKey, now };
    await syncMailAccount(
      { ...deps, fetchEmails: fakeMailbox([receiptEmail(5)]).fetchEmails },
      account.id,
    );

    // Будто прошлая синхронизация оборвалась после сохранения письма 5 — оно придёт ещё раз.
    await db.mailAccount.update({ where: { id: account.id }, data: { lastUid: null } });
    const again = fakeMailbox([receiptEmail(5), receiptEmail(7)]);
    const result = await syncMailAccount({ ...deps, fetchEmails: again.fetchEmails }, account.id);

    expect(result).toEqual({ status: 'synced', saved: 1 });
    expect(await db.rawEmail.count({ where: { mailAccountId: account.id } })).toBe(2);

    const next = fakeMailbox([]);
    await syncMailAccount({ ...deps, fetchEmails: next.fetchEmails }, account.id);
    expect(next.calls[0]?.[2].afterUid).toBe(7);
  });

  it('на Free забирает чеки только за 3 месяца', async () => {
    const account = await createAccount('expired');
    const mailbox = fakeMailbox([]);
    await syncMailAccount({ db, encryptionKey, now, fetchEmails: mailbox.fetchEmails }, account.id);
    expect(mailbox.calls[0]?.[2].since).toEqual(new Date('2026-07-13T12:00:00Z'));
  });

  it('при отозванном пароле помечает ящик и не бросает ошибку', async () => {
    const account = await createAccount();
    // Так ведёт себя IMAP, когда почта не принимает пароль: падает до первого письма.
    // eslint-disable-next-line require-yield
    const fetchEmails: FetchEmails = async function* () {
      throw new HCMailAuthError('Почта не приняла пароль');
    };

    const result = await syncMailAccount({ db, encryptionKey, now, fetchEmails }, account.id);

    expect(result).toEqual({ status: 'auth_failed' });
    const saved = await db.mailAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(saved).toMatchObject({ status: 'auth_failed', lastSyncAt: null });
  });

  it('пропускает удалённый ящик', async () => {
    const result = await syncMailAccount({ db, encryptionKey, now }, randomUUID());
    expect(result).toEqual({ status: 'skipped' });
  });
});
