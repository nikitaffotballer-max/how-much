import { z } from 'zod';
import { HC_CATEGORY_KEYS } from '../categories.js';
import { receiptListItemSchema } from './receipts.js';

const kopecks = z.number().int();

/** Самый длинный произвольный период: год (ТЗ, 3.5) — история в Pro хранится 12 месяцев. */
export const HC_MAX_CUSTOM_PERIOD_DAYS = 366;

export const HC_DASHBOARD_PERIODS = ['day', 'week', 'month', 'custom'] as const;
export type DashboardPeriod = (typeof HC_DASHBOARD_PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Параметры GET /api/v1/analytics/summary. Для «custom» даты включительно. */
export const dashboardQuerySchema = z.discriminatedUnion('period', [
  z.object({ period: z.enum(['day', 'week', 'month']) }),
  z
    .object({ period: z.literal('custom'), from: z.iso.date(), to: z.iso.date() })
    .refine(({ from, to }) => from <= to, {
      error: 'Начало периода позже конца',
      path: ['to'],
    })
    .refine(
      ({ from, to }) => (Date.parse(to) - Date.parse(from)) / DAY_MS < HC_MAX_CUSTOM_PERIOD_DAYS,
      { error: 'Период длиннее года', path: ['to'] },
    ),
]);

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

const dateRange = z.object({ from: z.iso.date(), to: z.iso.date() });

/**
 * Ответ GET /api/v1/analytics/summary. Одна схема на фронт и бэк:
 * API валидирует то, что отдаёт, фронтенд получает готовые типы.
 */
export const dashboardSummarySchema = z.object({
  /** Даты включительно. */
  period: dateRange.extend({ kind: z.enum(HC_DASHBOARD_PERIODS) }),
  previousPeriod: dateRange,
  total: kopecks,
  previousTotal: kopecks,
  receiptsCount: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
  averageReceipt: kopecks,
  previousAverageReceipt: kopecks,
  byCategory: z.array(z.object({ category: z.enum(HC_CATEGORY_KEYS), total: kopecks })),
  byDay: z.array(z.object({ date: z.iso.date(), total: kopecks })),
  /** Магазины с наибольшими тратами; наличные без магазина сюда не попадают. */
  topMerchants: z.array(
    z.object({
      name: z.string(),
      total: kopecks,
      receiptsCount: z.number().int().positive(),
    }),
  ),
  recent: z.array(receiptListItemSchema),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
