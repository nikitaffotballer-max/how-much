import { formatRub } from '@how-much/shared';
import type { ExtractedReceipt } from './extractReceipt.js';

/** Расхождение до рубля — это округления в чеке, а не ошибка разбора. */
const SUM_TOLERANCE_KOPECKS = 100;

export interface CheckedReceipt {
  merchantName: string;
  merchantLegalName: string | null;
  merchantInn: string | null;
  purchasedAt: Date;
  totalKopecks: number;
  paymentType: string | null;
  fn: string | null;
  fd: string | null;
  fpd: string | null;
  items: {
    name: string;
    quantity: number;
    priceKopecks: number;
    sumKopecks: number;
    /** null — категорию не знаем: шаблонный разбор её не определяет. */
    categoryKey: string | null;
  }[];
}

type ExtractedItem = ExtractedReceipt['items'][number];

/**
 * Черновик чека — от модели или от шаблонного разбора. Шаблон не знает категорий,
 * поэтому у позиций она может быть пустой.
 */
export type ReceiptDraft = Omit<ExtractedReceipt, 'isReceipt' | 'items'> & {
  items: (Omit<ExtractedItem, 'category'> & { category: string | null })[];
};

export type CheckResult = { ok: true; receipt: CheckedReceipt } | { ok: false; reason: string };

const toKopecks = (rubles: number) => Math.round(rubles * 100);
const digitsOrNull = (value: string | null) => value?.replace(/\D/g, '') || null;

/**
 * Модель и шаблон могут ошибиться, поэтому черновик проверяем арифметикой (ТЗ, 3.3):
 * сумма позиций должна сходиться с итогом. Не сошлось — письмо уйдёт в «Требуют внимания».
 */
export function checkReceipt(extracted: ReceiptDraft): CheckResult {
  if (extracted.total === null || extracted.items.length === 0) {
    return { ok: false, reason: 'В письме не нашлось итога или списка покупок' };
  }

  const purchasedAt = extracted.purchasedAt ? new Date(extracted.purchasedAt) : null;
  if (!purchasedAt || Number.isNaN(purchasedAt.getTime())) {
    return { ok: false, reason: 'Не удалось прочитать дату покупки' };
  }

  const items = extracted.items.map((item) => ({
    name: item.name.trim(),
    quantity: item.quantity,
    priceKopecks: toKopecks(item.price),
    sumKopecks: toKopecks(item.sum),
    categoryKey: item.category,
  }));
  const totalKopecks = toKopecks(extracted.total);
  const itemsKopecks = items.reduce((sum, item) => sum + item.sumKopecks, 0);
  if (Math.abs(itemsKopecks - totalKopecks) > SUM_TOLERANCE_KOPECKS) {
    return {
      ok: false,
      reason: `Сумма позиций ${formatRub(itemsKopecks)} не сходится с итогом ${formatRub(totalKopecks)}`,
    };
  }

  return {
    ok: true,
    receipt: {
      merchantName:
        extracted.merchantName?.trim() || extracted.merchantLegalName?.trim() || 'Без названия',
      merchantLegalName: extracted.merchantLegalName?.trim() || null,
      merchantInn: digitsOrNull(extracted.merchantInn),
      purchasedAt,
      totalKopecks,
      paymentType: extracted.paymentType,
      fn: digitsOrNull(extracted.fn),
      fd: digitsOrNull(extracted.fd),
      fpd: digitsOrNull(extracted.fpd),
      items,
    },
  };
}
