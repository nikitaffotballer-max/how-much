import type { ReceiptDraft } from './checkReceipt.js';

/**
 * Разбор чека без модели (ТЗ, этап 1: шаблонные парсеры). Письма ОФД — это печатная форма
 * кассового чека по 54-ФЗ: реквизиты (ФН, ФД, ФП, ИТОГ, ИНН) называются везде одинаково,
 * а строки позиций бывают в нескольких устойчивых видах. Что не узнали — отдаём модели.
 */

/** Фискальные реквизиты: есть в любом настоящем чеке, по ним ищем дубли до разбора. */
export interface FiscalRequisites {
  fn: string | null;
  fd: string | null;
  fpd: string | null;
  /** Итог в рублях. */
  total: number | null;
}

const NUMBER = String.raw`\d[\d\s]*[.,]\d{2}`;

/** «7 180.00», «1 135,64» → 7180, 1135.64. \s ловит и неразрывный пробел из вёрстки. */
export function parseAmount(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'));
}

function firstMatch(text: string, pattern: RegExp): string | null {
  return pattern.exec(text)?.[1] ?? null;
}

export function readRequisites(text: string): FiscalRequisites {
  // «N ФН 738…», «ФН № 738…», «ФН: 738…» — номер накопителя всегда 16 цифр.
  const fn = firstMatch(text, /ФН\s*(?:№|N)?\s*:?\s*(\d{16})\b/);
  // «Номер ФД: #149667» у ОФД.ру — с решёткой.
  const fd = firstMatch(text, /ФД\s*(?:№|N)?\s*:?\s*#?(\d{1,10})\b/);
  const fpd = firstMatch(text, /(?:ФПД|ФП)\s*(?:№|N)?\s*:?\s*(\d{6,12})\b/);
  // Первая строка, которая начинается с «ИТОГ»/«ИТОГО» и дальше содержит только сумму:
  // так не путаем с «ИТОГО без НДС» и «НДС ИТОГА ЧЕКА».
  const total = firstMatch(
    text,
    new RegExp(String.raw`^\s*ИТОГО?\s*:?\s*=?\s*(${NUMBER})\s*$`, 'im'),
  );
  return { fn, fd, fpd, total: total === null ? null : parseAmount(total) };
}

/** Похоже ли письмо на чек: без итога и фискальных номеров это ссылка или реклама. */
export function hasReceiptContent(requisites: FiscalRequisites): boolean {
  return requisites.total !== null && (requisites.fn !== null || requisites.fd !== null);
}

/** «13.10.2026 16:31», «16.09.26 16:15», «25.08.2026 в 12:11» → ISO по Москве. */
function readPurchasedAt(text: string): string | null {
  const match = /(\d{2})\.(\d{2})\.(\d{2}|\d{4})(?:\s+в)?\s+(\d{2}):(\d{2})/.exec(text);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const fullYear = year!.length === 2 ? `20${year}` : year;
  // В чеке время кассы без часового пояса; как и для модели, считаем его московским.
  return `${fullYear}-${month}-${day}T${hour}:${minute}:00+03:00`;
}

const LEGAL_FORMS = [
  'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ',
  'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО',
  'АКЦИОНЕРНОЕ ОБЩЕСТВО',
  'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ',
  'ООО',
  'OOO',
  'ПАО',
  'ЗАО',
  'АО',
  'ИП',
];
// Имя в кавычках может переноситься на следующую строку: «Общество … "Екатеринбург\nЯблоко"».
// Закрывающая кавычка — та, за которой пробел или конец: так «"Торговый дом "Лазурит""» целиком.
const LEGAL_FORM = new RegExp(
  String.raw`(?:^|[\s.(])((?:${LEGAL_FORMS.join('|')})\s*["«“][\s\S]{1,80}?["»”](?=\s|$|\.|,)|ИП\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})`,
  'i',
);

/** «Место расчётов: https://vkusvill.ru» → vkusvill.ru — когда юридического имени в чеке нет. */
const SETTLEMENT_SITE =
  /МЕСТО РАСЧ[ЕЁ]ТОВ:?\s+(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/i;

/**
 * Продавец: юридическое имя из чека или темы письма и понятное покупателю имя без «ООО».
 * Без юридического имени берём сайт из «Места расчётов»; если продавец с этим ИНН уже
 * известен, при сохранении останется его прежнее имя.
 */
function readMerchant(text: string, subject: string) {
  const legalName = LEGAL_FORM.exec(text)?.[1] ?? LEGAL_FORM.exec(subject)?.[1] ?? null;
  if (!legalName) {
    return { legalName: null, displayName: SETTLEMENT_SITE.exec(text)?.[1]?.toLowerCase() ?? null };
  }

  let display = legalName;
  for (const form of LEGAL_FORMS)
    display = display.replace(new RegExp(String.raw`^${form}\s*`, 'i'), '');
  // Кавычки снаружи и внутри: «Торговый дом "Лазурит"» → Торговый дом Лазурит.
  display = display
    .replace(/["«»“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // «ВКУСВИЛЛ» → «Вкусвилл»: капслок из кассы читать тяжело. Короткие аббревиатуры
  // вроде «ФПК» или «МВМ» оставляем как есть.
  if (display === display.toUpperCase() && !/^[А-ЯЁA-Z]{2,4}$/.test(display)) {
    display = display.charAt(0) + display.slice(1).toLowerCase();
  }
  return { legalName: legalName.replace(/\s+/g, ' ').trim(), displayName: display || null };
}

function readPaymentType(text: string): 'card' | 'cash' | 'other' | null {
  const cashless = firstMatch(text, new RegExp(String.raw`БЕЗНАЛИЧНЫМИ\s*:?\s*(${NUMBER})`, 'i'));
  if (cashless && parseAmount(cashless) > 0) return 'card';
  const cash = firstMatch(text, new RegExp(String.raw`(?<!БЕЗ)НАЛИЧНЫМИ\s*:?\s*(${NUMBER})`, 'i'));
  if (cash && parseAmount(cash) > 0) return 'cash';
  return null;
}

type DraftItem = ReceiptDraft['items'][number];

/** Строки, которые точно не название товара: реквизиты, заголовки, служебные пометки. */
const NOT_A_NAME =
  /^(ПРИХОД|ВОЗВРАТ|КАССОВЫЙ ЧЕК|ЧЕК|СМЕНА|КАССИР|НДС|ПРИЗНАК|СПОСОБ|СТАВКА|ИТОГ|ОБЩАЯ СТОИМОСТЬ|ПРЕДМЕТ РАСЧЕТА|В Т\.Ч\.|=|-{3,})/i;

/** Номер строки и количество перед названием у Контура: «1. 1 X Программа …». */
const NUMBERED_NAME = /^\s*\d+\.\s+(?:\d+(?:[.,]\d+)?\s*[xхX×]\s*)?(.+?)\s*$/;

function cleanName(name: string): string {
  return (
    name
      // Маркировка «[M]» — служебная пометка кассы, а не часть названия.
      .replace(/\[M\+?\]\s*/g, '')
      // У Taxcom перед названием артикул, после — единица измерения: «19000511578 Коробка ; шт.».
      .replace(/^\d{6,}\s+/, '')
      // Номер позиции: «2: Сервисный сбор».
      .replace(/^\d{1,3}:\s+/, '')
      .replace(/\s*;\s*[а-яё.]+$/i, '')
      .trim()
  );
}

/**
 * Название позиции — строки выше, похожие на название: с буквами и без «Ключ   Значение».
 * Длинное название касса переносит на несколько строк — склеиваем до трёх.
 */
function nameAbove(lines: string[], index: number, used: Set<number>): string | null {
  const parts: string[] = [];
  for (let i = index - 1; i >= Math.max(0, index - 4) && parts.length < 3; i -= 1) {
    const line = lines[i]!.trim();
    if (!line) {
      if (parts.length > 0) break;
      continue;
    }
    if (used.has(i)) break;
    const numbered = NUMBERED_NAME.exec(line);
    if (numbered) {
      used.add(i);
      parts.unshift(numbered[1]!);
      break;
    }
    if (NOT_A_NAME.test(line) || /\S {3,}\S/.test(line) || !/[а-яёa-z]/i.test(line)) break;
    used.add(i);
    parts.unshift(line);
  }
  return parts.length > 0 ? cleanName(parts.join(' ')) : null;
}

const QUANTITY_OR_PRICE = String.raw`\d+(?:[.,]\d+)?`;

/**
 * Строка «a x b [сумма]», иногда с текстом перед ней через несколько пробелов:
 * «1 x 250.00   250.00» (Taxcom), «3590.00 x 2.000   7180.00» (Saby),
 * «Пакет-майка   1 X 8.00» (ОФД.ру), «Платеж. Предоплата 100%   9900.00   ×   1   9900.00» (Контур),
 * «167 шт. x 1.00» (Платформа ОФД, с единицей измерения после количества).
 */
const MULTIPLY_LINE = new RegExp(
  String.raw`^\s*(?:(.*?\S)\s{2,})?(${QUANTITY_OR_PRICE})(?:\s*[а-яё]+\.?)?\s*[xхX×*]\s*(${QUANTITY_OR_PRICE})(?:\s+(${NUMBER}))?\s*$`,
);
/** Таблица Первого ОФД и ОФД «О-Дата»: «1.   Ацидофилин, 500 г   146.00   1 шт.   146.00». */
const TABLE_LINE = new RegExp(
  String.raw`^\s*\d+\.\s+(.+?)\s{2,}(\d+(?:[.,]\d{1,2})?)\s{2,}(${QUANTITY_OR_PRICE})(?:\s*[а-яё.]+)?\s{2,}(${NUMBER})\s*$`,
);
/** Сумма строки ниже «1 x …»: «Общая стоимость позиции … 771.64» (Платформа ОФД) или «= 240.00» (ОФД.ру). */
const POSITION_SUM = new RegExp(
  String.raw`^\s*(?:Общая стоимость позиции[^\d]*|=\s*)(${NUMBER})\s*$`,
  'i',
);

/** У цены две цифры после точки, у количества — ноль или три: так различаем «a x b». */
const isPrice = (value: string) => /[.,]\d{2}$/.test(value);

function readItems(text: string): DraftItem[] {
  const lines = text.split('\n');
  const used = new Set<number>();
  const items: DraftItem[] = [];

  lines.forEach((line, index) => {
    const table = TABLE_LINE.exec(line);
    if (table) {
      const [, name, price, quantity, sum] = table;
      items.push({
        name: cleanName(name!),
        price: parseAmount(price!),
        quantity: parseAmount(quantity!),
        sum: parseAmount(sum!),
        category: null,
      });
      return;
    }

    const multiply = MULTIPLY_LINE.exec(line);
    if (!multiply) return;
    const [, inlineText, first, second, lineSum] = multiply;
    const priceFirst = isPrice(first!) && !isPrice(second!);
    const price = parseAmount(priceFirst ? first! : second!);
    const quantity = parseAmount(priceFirst ? second! : first!);

    let sum = lineSum ? parseAmount(lineSum) : null;
    // У Платформы ОФД и ОФД.ру сумма строки — отдельной строкой ниже.
    for (let i = index + 1; sum === null && i < Math.min(lines.length, index + 4); i += 1) {
      const positionSum = POSITION_SUM.exec(lines[i]!);
      if (positionSum) sum = parseAmount(positionSum[1]!);
    }

    // Название в той же строке (ОФД.ру) или выше (остальные). У Контура в той же строке —
    // признаки расчёта, а название в нумерованной строке выше: её и предпочитаем.
    const above = nameAbove(lines, index, used);
    const inline = inlineText && !NOT_A_NAME.test(inlineText) ? cleanName(inlineText) : null;
    items.push({
      // Предоплата заказа приходит без названий товаров — честно так и пишем.
      name: above ?? inline ?? 'Оплата без списка товаров',
      price,
      quantity,
      sum: sum ?? Math.round(price * quantity * 100) / 100,
      category: null,
    });
  });

  return items;
}

/** Чего не хватило шаблону — для отладки на реальных письмах (receipts:dry-run). */
export type TemplateMiss = 'реквизиты' | 'дата' | 'продавец' | 'позиции';

export type TemplateResult = { draft: ReceiptDraft } | { missing: TemplateMiss };

/**
 * Черновик чека из текста письма или то, чего не хватило, если формат не узнали.
 * Арифметику (сумма позиций = итог) проверяет checkReceipt — общий для шаблона и модели.
 */
export function readReceiptTemplate(text: string, subject: string): TemplateResult {
  const requisites = readRequisites(text);
  if (!hasReceiptContent(requisites)) return { missing: 'реквизиты' };

  const purchasedAt = readPurchasedAt(text);
  if (!purchasedAt) return { missing: 'дата' };
  const merchant = readMerchant(text, subject);
  if (!merchant.displayName) return { missing: 'продавец' };
  const items = readItems(text);
  if (items.length === 0) return { missing: 'позиции' };

  const draft: ReceiptDraft = {
    merchantName: merchant.displayName,
    merchantLegalName: merchant.legalName,
    merchantInn: firstMatch(text, /ИНН\s*:?\s*(\d{12}|\d{10})\b/),
    purchasedAt,
    total: requisites.total,
    paymentType: readPaymentType(text),
    fn: requisites.fn,
    fd: requisites.fd,
    fpd: requisites.fpd,
    items,
  };
  return { draft };
}

export function parseReceiptTemplate(text: string, subject: string): ReceiptDraft | null {
  const result = readReceiptTemplate(text, subject);
  return 'draft' in result ? result.draft : null;
}
