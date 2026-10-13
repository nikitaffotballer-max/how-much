import { ImapFlow, type ImapFlowError, type SearchObject } from 'imapflow';
import { z } from 'zod';
import { simpleParser } from 'mailparser';
import { HC_RECEIPT_SENDERS, isReceiptEmail } from './receiptSenders.js';

export interface ImapServer {
  host: string;
  port: number;
  /** Принять самоподписанный сертификат — только для локального тестового сервера. */
  allowSelfSignedCert?: boolean;
}

export interface MailCredentials {
  login: string;
  password: string;
}

/** Почта не приняла логин или пароль приложения (или в ящике выключен IMAP). Повтор не поможет. */
export class HCMailAuthError extends Error {
  override readonly name = 'HCMailAuthError';
}

/** Сервер недоступен или оборвал соединение — стоит повторить позже. */
export class HCMailConnectionError extends Error {
  override readonly name = 'HCMailConnectionError';
}

const TIMEOUT_MS = 15_000;

async function connect(server: ImapServer, credentials: MailCredentials): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: server.host,
    port: server.port,
    // Все провайдеры из списка принимают TLS сразу при подключении (порт 993).
    secure: true,
    tls: { rejectUnauthorized: !server.allowSelfSignedCert },
    auth: { user: credentials.login, pass: credentials.password },
    logger: false,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    // Мы не ждём новых писем в реальном времени, а забираем их по расписанию.
    disableAutoIdle: true,
  });
  // Без обработчика событие error роняет процесс, а сами ошибки мы и так получаем из await.
  client.on('error', () => {});

  try {
    await client.connect();
    return client;
  } catch (error) {
    const imapError = error as ImapFlowError;
    if (imapError.authenticationFailed) {
      throw new HCMailAuthError('Почта не приняла логин или пароль приложения', { cause: error });
    }
    throw new HCMailConnectionError('Не удалось подключиться к почтовому серверу', {
      cause: error,
    });
  }
}

async function disconnect(client: ImapFlow) {
  await client.logout().catch(() => client.close());
}

/** Проверка при подключении ящика: только вход, письма не читаем. */
export async function verifyMailLogin(server: ImapServer, credentials: MailCredentials) {
  await disconnect(await connect(server, credentials));
}

export interface ReceiptEmail {
  /** Папка, где лежит письмо: UID уникален только внутри папки. */
  folder: string;
  /** UIDVALIDITY папки: если сервер её сменил, старые UID больше ничего не значат. */
  uidValidity: string;
  uid: number;
  messageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: Date;
  html: string;
}

/** Докуда дочитана папка: со следующей синхронизации берём письма с UID больше lastUid. */
// type, а не interface: Prisma принимает в Json только типы с индексной сигнатурой.
export type FolderCursor = {
  uidValidity: string;
  lastUid: number;
};

export type FolderCursors = Record<string, FolderCursor>;

/** Позиции хранятся в базе как JSON: читаем их через схему, а не верим на слово. */
export const folderCursorsSchema = z.record(
  z.string(),
  z.object({ uidValidity: z.string(), lastUid: z.number().int().nonnegative() }),
);

export interface FetchRange {
  /** Позиции по папкам; папку без позиции читаем с даты since. */
  cursors: FolderCursors;
  /** Для первой синхронизации папки: с какой даты брать письма. */
  since: Date;
}

/**
 * Папки, где чеков не бывает или где лежат копии: корзина, спам, отправленные, черновики,
 * а у Gmail — «Вся почта», «Помеченные» и «Важные», которые дублируют остальные папки.
 */
const SKIPPED_FOLDERS = new Set([
  '\\Trash',
  '\\Junk',
  '\\Sent',
  '\\Drafts',
  '\\All',
  '\\Flagged',
  '\\Important',
]);

/** Письма-чеки из одной папки, открытой на чтение. */
async function* fetchFolder(
  client: ImapFlow,
  server: ImapServer,
  folder: string,
  range: FetchRange,
): AsyncGenerator<ReceiptEmail> {
  const lock = await client.getMailboxLock(folder, { readOnly: true });
  try {
    const uidValidity = String(client.mailbox ? client.mailbox.uidValidity : '');
    const cursor = range.cursors[folder];
    const afterUid = cursor && cursor.uidValidity === uidValidity ? cursor.lastUid : null;

    const query: SearchObject = {
      or: HC_RECEIPT_SENDERS.map(({ domain }) => ({ from: domain })),
    };
    if (afterUid === null) query.since = range.since;
    else query.uid = `${afterUid + 1}:*`;

    // Диапазон «N:*» по стандарту IMAP всегда включает последнее письмо, даже если его UID < N,
    // поэтому старые UID отбрасываем сами.
    const found = (await client.search(query, { uid: true })) || [];
    const uids = found.filter((uid) => afterUid === null || uid > afterUid);
    if (uids.length === 0) return;

    // Сначала только заголовки: тело скачиваем лишь у писем, похожих на чеки.
    const receiptUids: number[] = [];
    for await (const message of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
      const from = message.envelope?.from?.[0]?.address ?? '';
      if (isReceiptEmail(from, message.envelope?.subject ?? '')) receiptUids.push(message.uid);
    }
    if (receiptUids.length === 0) return;

    for await (const message of client.fetch(
      receiptUids,
      { uid: true, source: true, internalDate: true },
      { uid: true },
    )) {
      if (!message.source) continue;
      const parsed = await simpleParser(message.source);
      const internalDate = message.internalDate ? new Date(message.internalDate) : undefined;
      yield {
        folder,
        uidValidity,
        uid: message.uid,
        // Message-ID бывает пустым у самописных рассылок — тогда отличаем письмо по папке и UID.
        messageId: parsed.messageId ?? `${folder}-${uidValidity}-${message.uid}@${server.host}`,
        fromAddress: parsed.from?.value[0]?.address ?? '',
        subject: parsed.subject ?? '',
        receivedAt: internalDate ?? parsed.date ?? new Date(),
        html: parsed.html || parsed.textAsHtml || '',
      };
    }
  } finally {
    lock.release();
  }
}

/** Папки, которые стоит проверять на чеки: Mail.ru, например, сам кладёт их в «Чеки». */
async function receiptFolders(client: ImapFlow): Promise<string[]> {
  const folders = await client.list();
  return folders
    .filter((folder) => !folder.flags.has('\\Noselect'))
    .filter((folder) => !SKIPPED_FOLDERS.has(folder.specialUse ?? ''))
    .map((folder) => folder.path);
}

/**
 * Письма-чеки от отправителей из белого списка из всех папок, кроме служебных.
 * Ящик открываем только на чтение: письма не помечаются прочитанными и не удаляются (ТЗ, раздел 9).
 */
export async function* fetchReceiptEmails(
  server: ImapServer,
  credentials: MailCredentials,
  range: FetchRange,
): AsyncGenerator<ReceiptEmail> {
  const client = await connect(server, credentials);
  try {
    for (const folder of await receiptFolders(client)) {
      yield* fetchFolder(client, server, folder, range);
    }
  } finally {
    await disconnect(client);
  }
}

export interface SenderSurveyRow {
  folder: string;
  domain: string;
  count: number;
  /** Одна тема для примера — чтобы понять, что это за письма. */
  sampleSubject: string;
  /** Сколько из них забирает синхронизация (белый список отправителей и тема). */
  taken: number;
}

/**
 * Обзор ящика для этапа 0 ТЗ: какие отправители присылают письма со словом «чек» в теме
 * и в каких папках они лежат. Читаем только заголовки, ящик открываем на чтение.
 */
export async function surveyReceiptSenders(
  server: ImapServer,
  credentials: MailCredentials,
  since: Date,
): Promise<SenderSurveyRow[]> {
  const client = await connect(server, credentials);
  const rows = new Map<string, SenderSurveyRow>();
  try {
    for (const path of await receiptFolders(client)) {
      const lock = await client.getMailboxLock(path, { readOnly: true });
      try {
        const uids =
          (await client.search(
            {
              since,
              or: [
                { subject: 'чек' },
                { subject: 'receipt' },
                ...HC_RECEIPT_SENDERS.map(({ domain }) => ({ from: domain })),
              ],
            },
            { uid: true },
          )) || [];
        if (uids.length === 0) continue;
        for await (const message of client.fetch(
          uids,
          { uid: true, envelope: true },
          { uid: true },
        )) {
          const from = message.envelope?.from?.[0]?.address ?? '';
          const subject = message.envelope?.subject ?? '';
          const domain = from.split('@')[1]?.toLowerCase() ?? '?';
          const key = `${path}|${domain}`;
          const row = rows.get(key) ?? {
            folder: path,
            domain,
            count: 0,
            sampleSubject: subject,
            taken: 0,
          };
          row.count += 1;
          if (isReceiptEmail(from, subject)) row.taken += 1;
          rows.set(key, row);
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await disconnect(client);
  }
  return [...rows.values()].sort((a, b) => b.count - a.count);
}
