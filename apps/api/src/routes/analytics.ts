import { dashboardSummarySchema } from '@how-much/shared';
import type { FastifyPluginAsync } from 'fastify';
import { demoDashboard } from '../demo/dashboard.js';

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // Валидируем и исходящие данные: ошибка в расчётах всплывёт здесь, а не в браузере.
  app.get('/analytics/summary', async () => dashboardSummarySchema.parse(demoDashboard));
};
