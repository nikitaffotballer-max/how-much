/**
 * Белый список отправителей чеков (ТЗ, 3.2 и раздел 9): из ящика читаем только их письма.
 *
 * Операторы фискальных данных (ОФД) присылают только чеки, поэтому берём все их письма.
 * Магазины присылают ещё и рекламу — от них берём только письма со словом «чек» в теме.
 * Список пополняем по реальным ящикам: pnpm --filter @how-much/worker mail:survey <адрес>.
 */
export interface ReceiptSender {
  domain: string;
  subjectPattern?: RegExp;
}

const RECEIPT_SUBJECT = /ч[её]к|receipt/i;

export const HC_RECEIPT_SENDERS: readonly ReceiptSender[] = [
  { domain: 'ofd.ru' },
  { domain: '1-ofd.ru' },
  { domain: 'platformaofd.ru' },
  { domain: 'taxcom.ru' },
  { domain: 'ofd-ya.ru' },
  { domain: 'pofd.ru' },
  { domain: 'o-data.ru' },
  { domain: 'checkkontur.ru' },
  { domain: 'sbis.ru', subjectPattern: RECEIPT_SUBJECT },
  // Saby — новое имя СБИС: чеки приходят с этого домена.
  { domain: 'saby.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'kontur.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'ozon.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'wildberries.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'vkusvill.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: '5ka.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'magnit.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'mvideo.ru', subjectPattern: RECEIPT_SUBJECT },
  { domain: 'afisha.ru', subjectPattern: RECEIPT_SUBJECT },
];

/** Домен отправителя совпадает с доменом из списка или является его поддоменом (mail.ozon.ru). */
function matchesDomain(address: string, domain: string): boolean {
  const senderDomain = address.trim().toLowerCase().split('@')[1] ?? '';
  return senderDomain === domain || senderDomain.endsWith(`.${domain}`);
}

/** Похоже ли письмо на чек от известного отправителя. */
export function isReceiptEmail(fromAddress: string, subject: string): boolean {
  const sender = HC_RECEIPT_SENDERS.find(({ domain }) => matchesDomain(fromAddress, domain));
  if (!sender) return false;
  return sender.subjectPattern ? sender.subjectPattern.test(subject) : true;
}
