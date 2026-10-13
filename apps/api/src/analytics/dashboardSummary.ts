import type { PrismaClient } from '@how-much/db';
import { HC_CATEGORY_KEYS, type CategoryKey, type DashboardSummary } from '@how-much/shared';
import { monthToDate, moscowDateKey } from './period.js';

const RECENT_LIMIT = 5;
const PREVIEW_ITEMS = 3;

interface CategoryRef {
  key: string;
  parent: { key: string } | null;
}

/** Подкатегория «groceries.dairy» → верхний уровень «groceries». Неизвестное — в «Другое». */
function topCategory(category: CategoryRef | null | undefined): CategoryKey | null {
  const key = category?.parent?.key ?? category?.key;
  return key && (HC_CATEGORY_KEYS as readonly string[]).includes(key) ? (key as CategoryKey) : null;
}

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/**
 * Сводка для дашборда: текущий месяц и те же дни прошлого.
 * Чеков у одного человека за два месяца — сотни, поэтому считаем в памяти; если упрёмся
 * в скорость (ТЗ: 300 мс на 10 000 чеков), перенесём агрегацию в SQL.
 */
export async function getDashboardSummary(
  db: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<DashboardSummary> {
  const { current, previous, days } = monthToDate(now);

  const receipts = await db.receipt.findMany({
    where: { userId, purchasedAt: { gte: previous.from, lte: current.to } },
    orderBy: { purchasedAt: 'desc' },
    include: {
      merchant: { include: { defaultCategory: { include: { parent: true } } } },
      items: {
        orderBy: { position: 'asc' },
        include: { category: { include: { parent: true } }, product: true },
      },
    },
  });

  const currentReceipts = receipts.filter((r) => r.purchasedAt >= current.from);
  const previousReceipts = receipts.filter(
    (r) => r.purchasedAt >= previous.from && r.purchasedAt < previous.to,
  );

  const total = sum(currentReceipts.map((r) => r.totalKopecks));
  const previousTotal = sum(previousReceipts.map((r) => r.totalKopecks));
  const average = (list: typeof receipts, listTotal: number) =>
    list.length === 0 ? 0 : Math.round(listTotal / list.length);

  /** Категория строки: своя → магазина по умолчанию → «Другое». */
  const itemCategory = (receipt: (typeof receipts)[number], item: (typeof receipt.items)[number]) =>
    topCategory(item.category) ?? topCategory(receipt.merchant?.defaultCategory) ?? 'other';

  /** Главная категория чека — та, на которую пришлось больше всего денег. */
  const mainCategory = (receipt: (typeof receipts)[number]): CategoryKey => {
    const totals = new Map<CategoryKey, number>();
    for (const item of receipt.items) {
      const key = itemCategory(receipt, item);
      totals.set(key, (totals.get(key) ?? 0) + item.sumKopecks);
    }
    const [top] = [...totals].sort((a, b) => b[1] - a[1]);
    return top?.[0] ?? topCategory(receipt.merchant?.defaultCategory) ?? 'other';
  };

  const byCategoryMap = new Map<CategoryKey, number>();
  const addTo = (key: CategoryKey, amount: number) =>
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + amount);

  for (const receipt of currentReceipts) {
    for (const item of receipt.items) addTo(itemCategory(receipt, item), item.sumKopecks);
    // Скидки и округления: разницу между итогом чека и суммой строк относим к главной категории,
    // чтобы сумма по категориям всегда совпадала с общей суммой.
    const remainder = receipt.totalKopecks - sum(receipt.items.map((i) => i.sumKopecks));
    if (remainder !== 0) addTo(mainCategory(receipt), remainder);
  }

  const dayTotals = new Map<string, number>();
  for (const receipt of currentReceipts) {
    const key = moscowDateKey(receipt.purchasedAt);
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + receipt.totalKopecks);
  }

  const needsAttentionCount = await db.rawEmail.count({
    where: { mailAccount: { userId }, parseStatus: 'failed' },
  });

  return {
    period: { from: days[0] ?? moscowDateKey(current.from), to: moscowDateKey(current.to) },
    total,
    previousTotal,
    receiptsCount: currentReceipts.length,
    needsAttentionCount,
    averageReceipt: average(currentReceipts, total),
    previousAverageReceipt: average(previousReceipts, previousTotal),
    // Индекс личной инфляции появится на этапе 3 (ТЗ, 3.6).
    personalInflation: null,
    byCategory: [...byCategoryMap]
      .filter(([, amount]) => amount !== 0)
      .map(([category, amount]) => ({ category, total: amount })),
    byDay: days.map((date) => ({ date, total: dayTotals.get(date) ?? 0 })),
    recent: receipts.slice(0, RECENT_LIMIT).map((receipt) => {
      const names = receipt.items.map((i) => (i.product?.baseName ?? i.rawName).toLowerCase());
      const preview =
        names.slice(0, PREVIEW_ITEMS).join(', ') + (names.length > PREVIEW_ITEMS ? '…' : '');
      return {
        id: receipt.id,
        merchant: receipt.merchant?.displayName ?? receipt.note ?? 'Без названия',
        category: mainCategory(receipt),
        purchasedAt: receipt.purchasedAt.toISOString(),
        source: receipt.source,
        itemsPreview: receipt.source === 'cash' ? 'наличные' : preview,
        total: receipt.totalKopecks,
      };
    }),
  };
}
