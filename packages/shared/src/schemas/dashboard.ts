import { z } from 'zod';
import { HC_CATEGORY_KEYS } from '../categories.js';
import { receiptListItemSchema } from './receipts.js';

const kopecks = z.number().int();

/**
 * Ответ GET /api/v1/analytics/summary. Одна схема на фронт и бэк:
 * API валидирует то, что отдаёт, фронтенд получает готовые типы.
 */
export const dashboardSummarySchema = z.object({
  period: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
  }),
  total: kopecks,
  previousTotal: kopecks,
  receiptsCount: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
  averageReceipt: kopecks,
  previousAverageReceipt: kopecks,
  byCategory: z.array(z.object({ category: z.enum(HC_CATEGORY_KEYS), total: kopecks })),
  byDay: z.array(z.object({ date: z.iso.date(), total: kopecks })),
  recent: z.array(receiptListItemSchema),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
