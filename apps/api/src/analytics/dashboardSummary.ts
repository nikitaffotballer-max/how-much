import type { PrismaClient } from '@how-much/db';
import type { CategoryKey, DashboardQuery, DashboardSummary } from '@how-much/shared';
import {
  itemCategory,
  mainCategory,
  receiptRemainder,
  receiptWithItems,
  toReceiptListItem,
} from '../receipts/receiptView.js';
import { moscowDateKey, resolveRange, type Period } from './period.js';

const RECENT_LIMIT = 5;
const TOP_MERCHANTS_LIMIT = 5;
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/** Даты включительно: полуинтервал [from, to) заканчивается за миллисекунду до to. */
function dateRange({ from, to }: Period) {
  return { from: moscowDateKey(from), to: moscowDateKey(new Date(to.getTime() - 1)) };
}

/**
 * Сводка для дашборда за выбранный период и такой же отрезок перед ним.
 * Чеков у одного человека за два периода — сотни, поэтому считаем в памяти; если упрёмся
 * в скорость (ТЗ: 300 мс на 10 000 чеков), перенесём агрегацию в SQL.
 */
export async function getDashboardSummary(
  db: PrismaClient,
  userId: string,
  query: DashboardQuery,
  now: Date = new Date(),
): Promise<DashboardSummary> {
  const { current, previous, days } = resolveRange(query, now);

  const receipts = await db.receipt.findMany({
    where: { userId, purchasedAt: { gte: previous.from, lt: current.to } },
    orderBy: { purchasedAt: 'desc' },
    include: receiptWithItems,
  });

  const currentReceipts = receipts.filter((r) => r.purchasedAt >= current.from);
  const previousReceipts = receipts.filter(
    (r) => r.purchasedAt >= previous.from && r.purchasedAt < previous.to,
  );

  const total = sum(currentReceipts.map((r) => r.totalKopecks));
  const previousTotal = sum(previousReceipts.map((r) => r.totalKopecks));
  const average = (list: typeof receipts, listTotal: number) =>
    list.length === 0 ? 0 : Math.round(listTotal / list.length);

  const byCategoryMap = new Map<CategoryKey, number>();
  const addTo = (key: CategoryKey, amount: number) =>
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + amount);

  for (const receipt of currentReceipts) {
    for (const item of receipt.items) addTo(itemCategory(receipt, item), item.sumKopecks);
    // Скидки и округления: разницу между итогом чека и суммой строк относим к главной категории,
    // чтобы сумма по категориям всегда совпадала с общей суммой.
    const remainder = receiptRemainder(receipt);
    if (remainder !== 0) addTo(mainCategory(receipt), remainder);
  }

  const dayTotals = new Map<string, number>();
  for (const receipt of currentReceipts) {
    const key = moscowDateKey(receipt.purchasedAt);
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + receipt.totalKopecks);
  }

  const merchants = new Map<string, DashboardSummary['topMerchants'][number]>();
  for (const receipt of currentReceipts) {
    if (!receipt.merchant) continue;
    const entry = merchants.get(receipt.merchant.id) ?? {
      name: receipt.merchant.displayName,
      total: 0,
      receiptsCount: 0,
    };
    entry.total += receipt.totalKopecks;
    entry.receiptsCount += 1;
    merchants.set(receipt.merchant.id, entry);
  }

  const needsAttentionCount = await db.rawEmail.count({
    where: { mailAccount: { userId }, parseStatus: 'failed' },
  });

  return {
    period: { kind: query.period, ...dateRange(current) },
    previousPeriod: dateRange(previous),
    total,
    previousTotal,
    receiptsCount: currentReceipts.length,
    needsAttentionCount,
    averageReceipt: average(currentReceipts, total),
    previousAverageReceipt: average(previousReceipts, previousTotal),
    byCategory: [...byCategoryMap]
      .filter(([, amount]) => amount !== 0)
      .map(([category, amount]) => ({ category, total: amount })),
    byDay: days.map((date) => ({ date, total: dayTotals.get(date) ?? 0 })),
    topMerchants: [...merchants.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_MERCHANTS_LIMIT),
    recent: currentReceipts.slice(0, RECENT_LIMIT).map(toReceiptListItem),
  };
}
