import { z } from 'zod';
import { HC_CATEGORY_KEYS } from '../categories.js';

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
  /** null — индекс недоступен (Free или мало данных). */
  personalInflation: z
    .object({ since: z.iso.date(), ours: z.number(), official: z.number() })
    .nullable(),
  byCategory: z.array(z.object({ category: z.enum(HC_CATEGORY_KEYS), total: kopecks })),
  byDay: z.array(z.object({ date: z.iso.date(), total: kopecks })),
  recent: z.array(
    z.object({
      id: z.string(),
      merchant: z.string(),
      category: z.enum(HC_CATEGORY_KEYS),
      purchasedAt: z.iso.datetime(),
      source: z.enum(['email', 'cash', 'manual']),
      itemsPreview: z.string(),
      total: kopecks,
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
