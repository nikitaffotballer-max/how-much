import { dashboardSummarySchema } from '@how-much/shared';
import type { FastifyPluginAsync } from 'fastify';
import { getDashboardSummary } from '../analytics/dashboardSummary.js';
import { requireUserId } from '../auth/requestUser.js';

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/analytics/summary', async (request) => {
    const userId = requireUserId(request);
    const summary = await getDashboardSummary(app.db, userId);
    // Валидируем и исходящие данные: ошибка в расчётах всплывёт здесь, а не в браузере.
    return dashboardSummarySchema.parse(summary);
  });
};
