import type { Prisma } from '@how-much/db';
import { HC_CATEGORY_KEYS, type CategoryKey, type ReceiptListItem } from '@how-much/shared';

/** Всё, что нужно, чтобы показать чек: магазин и позиции с категориями. */
export const receiptWithItems = {
  merchant: { include: { defaultCategory: { include: { parent: true } } } },
  items: {
    orderBy: { position: 'asc' },
    include: { category: { include: { parent: true } }, product: true },
  },
} as const satisfies Prisma.ReceiptInclude;

export type ReceiptWithItems = Prisma.ReceiptGetPayload<{ include: typeof receiptWithItems }>;
type ItemWithCategory = ReceiptWithItems['items'][number];

interface CategoryRef {
  key: string;
  parent: { key: string } | null;
}

const PREVIEW_ITEMS = 3;

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/** Подкатегория «groceries.dairy» → верхний уровень «groceries». Неизвестное — null. */
export function topCategory(category: CategoryRef | null | undefined): CategoryKey | null {
  const key = category?.parent?.key ?? category?.key;
  return key && (HC_CATEGORY_KEYS as readonly string[]).includes(key) ? (key as CategoryKey) : null;
}

/** Категория строки: своя → магазина по умолчанию → «Другое». */
export function itemCategory(receipt: ReceiptWithItems, item: ItemWithCategory): CategoryKey {
  return topCategory(item.category) ?? topCategory(receipt.merchant?.defaultCategory) ?? 'other';
}

/** Главная категория чека — та, на которую пришлось больше всего денег. */
export function mainCategory(receipt: ReceiptWithItems): CategoryKey {
  const totals = new Map<CategoryKey, number>();
  for (const item of receipt.items) {
    const key = itemCategory(receipt, item);
    totals.set(key, (totals.get(key) ?? 0) + item.sumKopecks);
  }
  const [top] = [...totals].sort((a, b) => b[1] - a[1]);
  return top?.[0] ?? topCategory(receipt.merchant?.defaultCategory) ?? 'other';
}

/** Скидки и округления: разница между итогом чека и суммой строк. */
export function receiptRemainder(receipt: ReceiptWithItems): number {
  return receipt.totalKopecks - sum(receipt.items.map((item) => item.sumKopecks));
}

export function merchantName(receipt: ReceiptWithItems): string {
  return receipt.merchant?.displayName ?? receipt.note ?? 'Без названия';
}

export function toReceiptListItem(receipt: ReceiptWithItems): ReceiptListItem {
  const names = receipt.items.map((item) => (item.product?.baseName ?? item.rawName).toLowerCase());
  const preview =
    names.slice(0, PREVIEW_ITEMS).join(', ') + (names.length > PREVIEW_ITEMS ? '…' : '');
  return {
    id: receipt.id,
    merchant: merchantName(receipt),
    category: mainCategory(receipt),
    purchasedAt: receipt.purchasedAt.toISOString(),
    source: receipt.source,
    itemsPreview: receipt.source === 'cash' ? 'наличные' : preview,
    total: receipt.totalKopecks,
  };
}
