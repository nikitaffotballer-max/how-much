import { createPrismaClient } from '@how-much/db';
import { encryptSecret, HCMailAuthError, type ReceiptEmail } from '@how-much/mail';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { RAW_EMAIL_TTL_MS, syncMailAccount, type FetchEmails } from './syncMailAccount.js';

// Свой домен: тесты API идут параллельно и удаляют пользователей @test.how-much.local.
const TEST_EMAIL_DOMAIN = 'worker.test.how-much.local';
const db = createPrismaClient(process.env.DATABASE_URL ?? '');
const encryptionKey = randomBytes(32);
const now = new Date('2026-10-13T12:00:00Z');
/** Очередь разбора: запоминаем, какие письма в неё поставили. */
const parseQueue: string[] = [];
const enqueueParse = async (rawEmailId: string) => {
  parseQueue.push(rawEmailId);
};

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

function receiptEmail(uid: number, folder = 'INBOX', uidValidity = '1'): ReceiptEmail {
  return {
    folder,
    uidValidity,
    uid,
    messageId: `<${folder}-${uid}@ofd.ru>`,
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
    const { cursors } = args[2];
    yield* emails.filter((email) => {
      const cursor = cursors[email.folder];
      return !cursor || cursor.uidValidity !== email.uidValidity || email.uid > cursor.lastUid;
    });
  };
  return { calls, fetchEmails };
}

describe('syncMailAccount', () => {
  it('сохраняет письма из разных папок и запоминает позицию каждой', async () => {
    const account = await createAccount();
    const mailbox = fakeMailbox([
      receiptEmail(5),
      receiptEmail(9),
      receiptEmail(3, 'INBOX/Receipts', '77'),
    ]);

    const result = await syncMailAccount(
      { db, encryptionKey, enqueueParse, now, fetchEmails: mailbox.fetchEmails },
      account.id,
    );

    expect(result).toEqual({ status: 'synced', saved: 3 });
    const [server, credentials, range] = mailbox.calls[0]!;
    expect(server.host).toBe('imap.yandex.ru');
    expect(credentials).toEqual({ login: 'me@yandex.ru', password: 'app-password' });
    // Пробный период — это Pro, а в Pro импорт за 12 месяцев.
    expect(range).toEqual({ cursors: {}, since: new Date('2025-10-13T12:00:00Z') });

    const saved = await db.mailAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: { rawEmails: { orderBy: { messageId: 'asc' } } },
    });
    expect(saved).toMatchObject({
      folderCursors: {
        INBOX: { uidValidity: '1', lastUid: 9 },
        'INBOX/Receipts': { uidValidity: '77', lastUid: 3 },
      },
      lastSyncAt: now,
      status: 'active',
    });
    expect(saved.rawEmails.map((raw) => [raw.messageId, raw.parseStatus])).toEqual([
      ['<INBOX-5@ofd.ru>', 'pending'],
      ['<INBOX-9@ofd.ru>', 'pending'],
      ['<INBOX/Receipts-3@ofd.ru>', 'pending'],
    ]);
    expect(parseQueue).toEqual(expect.arrayContaining(saved.rawEmails.map((raw) => raw.id)));
    expect(saved.rawEmails[0]?.deleteAfter).toEqual(new Date(now.getTime() + RAW_EMAIL_TTL_MS));
  });

  it('продолжает с позиции папки и не дублирует письма после обрыва', async () => {
    const account = await createAccount();
    const deps = { db, encryptionKey, enqueueParse, now };
    await syncMailAccount(
      { ...deps, fetchEmails: fakeMailbox([receiptEmail(5)]).fetchEmails },
      account.id,
    );

    // Будто прошлая синхронизация оборвалась после сохранения письма 5 — оно придёт ещё раз.
    await db.mailAccount.update({ where: { id: account.id }, data: { folderCursors: {} } });
    const again = fakeMailbox([receiptEmail(5), receiptEmail(7)]);
    const result = await syncMailAccount({ ...deps, fetchEmails: again.fetchEmails }, account.id);

    expect(result).toEqual({ status: 'synced', saved: 1 });
    expect(await db.rawEmail.count({ where: { mailAccountId: account.id } })).toBe(2);

    const next = fakeMailbox([]);
    await syncMailAccount({ ...deps, fetchEmails: next.fetchEmails }, account.id);
    expect(next.calls[0]?.[2].cursors).toEqual({ INBOX: { uidValidity: '1', lastUid: 7 } });
  });

  it('перечитывает папку, если сервер сменил её UIDVALIDITY', async () => {
    const account = await createAccount();
    const deps = { db, encryptionKey, enqueueParse, now };
    await syncMailAccount(
      { ...deps, fetchEmails: fakeMailbox([receiptEmail(50)]).fetchEmails },
      account.id,
    );

    // Папку пересоздали: нумерация началась заново, новое письмо получило UID 2.
    const renumbered = fakeMailbox([receiptEmail(2, 'INBOX', '2')]);
    const result = await syncMailAccount(
      { ...deps, fetchEmails: renumbered.fetchEmails },
      account.id,
    );

    expect(result).toEqual({ status: 'synced', saved: 1 });
    const saved = await db.mailAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(saved.folderCursors).toEqual({ INBOX: { uidValidity: '2', lastUid: 2 } });
  });

  it('на Free забирает чеки только за 3 месяца', async () => {
    const account = await createAccount('expired');
    const mailbox = fakeMailbox([]);
    await syncMailAccount(
      { db, encryptionKey, enqueueParse, now, fetchEmails: mailbox.fetchEmails },
      account.id,
    );
    expect(mailbox.calls[0]?.[2].since).toEqual(new Date('2026-07-13T12:00:00Z'));
  });

  it('при отозванном пароле помечает ящик и не бросает ошибку', async () => {
    const account = await createAccount();
    // Так ведёт себя IMAP, когда почта не принимает пароль: падает до первого письма.
    // eslint-disable-next-line require-yield
    const fetchEmails: FetchEmails = async function* () {
      throw new HCMailAuthError('Почта не приняла пароль');
    };

    const result = await syncMailAccount(
      { db, encryptionKey, enqueueParse, now, fetchEmails },
      account.id,
    );

    expect(result).toEqual({ status: 'auth_failed' });
    const saved = await db.mailAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(saved).toMatchObject({ status: 'auth_failed', lastSyncAt: null });
  });

  it('пропускает удалённый ящик', async () => {
    const result = await syncMailAccount({ db, encryptionKey, enqueueParse, now }, randomUUID());
    expect(result).toEqual({ status: 'skipped' });
  });
});
