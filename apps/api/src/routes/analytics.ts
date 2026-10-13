import { dashboardQuerySchema, dashboardSummarySchema } from '@how-much/shared';
import type { FastifyPluginAsync } from 'fastify';
import { getDashboardSummary } from '../analytics/dashboardSummary.js';
import { requireUserId } from '../auth/requestUser.js';

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/analytics/summary', async (request) => {
    const userId = requireUserId(request);
    // Без параметров — текущий месяц.
    const query = dashboardQuerySchema.parse({ period: 'month', ...(request.query as object) });
    const summary = await getDashboardSummary(app.db, userId, query);
    // Валидируем и исходящие данные: ошибка в расчётах всплывёт здесь, а не в браузере.
    return dashboardSummarySchema.parse(summary);
  });
};
