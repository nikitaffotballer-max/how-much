import { ImapFlow, type ImapFlowError, type SearchObject } from 'imapflow';
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
  /** UID письма в папке «Входящие» — по нему продолжаем со следующей синхронизации. */
  uid: number;
  messageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: Date;
  html: string;
}

export interface FetchRange {
  /** UID последнего уже забранного письма; null — первая синхронизация. */
  afterUid: number | null;
  /** Для первой синхронизации: с какой даты брать письма. */
  since: Date;
}

/**
 * Письма-чеки из «Входящих» от отправителей из белого списка.
 * Ящик открываем только на чтение: письма не помечаются прочитанными и не удаляются (ТЗ, раздел 9).
 */
export async function* fetchReceiptEmails(
  server: ImapServer,
  credentials: MailCredentials,
  range: FetchRange,
): AsyncGenerator<ReceiptEmail> {
  const client = await connect(server, credentials);
  try {
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
      const query: SearchObject = {
        or: HC_RECEIPT_SENDERS.map(({ domain }) => ({ from: domain })),
      };
      if (range.afterUid === null) query.since = range.since;
      else query.uid = `${range.afterUid + 1}:*`;

      // Диапазон «N:*» по стандарту IMAP всегда включает последнее письмо, даже если его UID < N,
      // поэтому старые UID отбрасываем сами.
      const found = (await client.search(query, { uid: true })) || [];
      const uids = found.filter((uid) => range.afterUid === null || uid > range.afterUid);
      if (uids.length === 0) return;

      // Сначала только заголовки: тело скачиваем лишь у писем, похожих на чеки.
      const receiptUids: number[] = [];
      for await (const message of client.fetch(
        uids,
        { uid: true, envelope: true },
        { uid: true },
      )) {
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
          uid: message.uid,
          // Message-ID бывает пустым у самописных рассылок — тогда отличаем письмо по UID.
          messageId: parsed.messageId ?? `uid-${message.uid}@${server.host}`,
          fromAddress: parsed.from?.value[0]?.address ?? '',
          subject: parsed.subject ?? '',
          receivedAt: internalDate ?? parsed.date ?? new Date(),
          html: parsed.html || parsed.textAsHtml || '',
        };
      }
    } finally {
      lock.release();
    }
  } finally {
    await disconnect(client);
  }
}
