import type { DashboardSummary } from '@how-much/shared';

/**
 * Демо-данные дашборда, совпадают с макетом. Временная замена, пока нет базы:
 * на этапе 1 этот файл уйдёт, а сводка будет считаться из чеков в PostgreSQL.
 */
const dailyRubles = [2100, 3450, 1200, 5600, 980, 4300, 2750, 1890, 3200, 640, 6150, 2830, 3330];

export const demoDashboard: DashboardSummary = {
  period: { from: '2026-10-01', to: '2026-10-13' },
  total: 3_842_000,
  previousTotal: 4_087_000,
  receiptsCount: 47,
  needsAttentionCount: 3,
  averageReceipt: 81_700,
  previousAverageReceipt: 86_200,
  personalInflation: { since: '2026-05-01', ours: 0.048, official: 0.029 },
  byCategory: [
    { category: 'groceries', total: 1_694_000 },
    { category: 'marketplaces', total: 821_000 },
    { category: 'cafe', total: 487_000 },
    { category: 'health', total: 430_000 },
    { category: 'home', total: 265_000 },
    { category: 'other', total: 145_000 },
  ],
  byDay: dailyRubles.map((rub, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    total: rub * 100,
  })),
  recent: [
    {
      id: 'r1',
      merchant: 'Пятёрочка',
      category: 'groceries',
      purchasedAt: '2026-10-13T11:02:00Z',
      source: 'email',
      itemsPreview: '12 позиций · молоко, сыр, курица…',
      total: 187_000,
    },
    {
      id: 'r2',
      merchant: 'Кофейня на Лесной',
      category: 'cafe',
      purchasedAt: '2026-10-13T06:41:00Z',
      source: 'email',
      itemsPreview: 'капучино, круассан',
      total: 38_000,
    },
    {
      id: 'r3',
      merchant: 'Рынок',
      category: 'groceries',
      purchasedAt: '2026-10-13T09:00:00Z',
      source: 'cash',
      itemsPreview: 'наличные, добавлено вручную',
      total: 108_000,
    },
    {
      id: 'r4',
      merchant: 'ВкусВилл',
      category: 'groceries',
      purchasedAt: '2026-10-12T16:15:00Z',
      source: 'email',
      itemsPreview: '9 позиций · овощи, йогурты…',
      total: 283_000,
    },
    {
      id: 'r5',
      merchant: 'Ozon',
      category: 'marketplaces',
      purchasedAt: '2026-10-11T07:20:00Z',
      source: 'email',
      itemsPreview: '3 позиции · кофе в зёрнах, губки…',
      total: 499_000,
    },
  ],
};
