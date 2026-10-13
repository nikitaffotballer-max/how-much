import type { PrismaClient } from '@how-much/db';
import type { CategoryKey, DashboardSummary } from '@how-much/shared';
import {
  itemCategory,
  mainCategory,
  receiptRemainder,
  receiptWithItems,
  toReceiptListItem,
} from '../receipts/receiptView.js';
import { monthToDate, moscowDateKey } from './period.js';

const RECENT_LIMIT = 5;
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
    byCategory: [...byCategoryMap]
      .filter(([, amount]) => amount !== 0)
      .map(([category, amount]) => ({ category, total: amount })),
    byDay: days.map((date) => ({ date, total: dayTotals.get(date) ?? 0 })),
    recent: receipts.slice(0, RECENT_LIMIT).map(toReceiptListItem),
  };
}
