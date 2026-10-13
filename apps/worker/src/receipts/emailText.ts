import { convert } from 'html-to-text';

/** Чек занимает пару экранов текста; всё, что длиннее, — рекламный хвост письма. */
const MAX_TEXT_LENGTH = 30_000;

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
// +7 (912) 345-67-89, 8 912 345 67 89 и т. п. Номера ФН и ФД длиннее и без «+7/8 (...)».
const PHONE = /(\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g;

/**
 * Текст письма для модели: вместо HTML — строки чека, без картинок и ссылок.
 * Адреса почты и телефоны вырезаем: в LLM уходят только строки чека (ТЗ, раздел 9).
 */
export function receiptTextFromHtml(html: string): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'table', format: 'dataTable' },
    ],
  });

  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[телефон]')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}
