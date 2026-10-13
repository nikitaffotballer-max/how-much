import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import { analyticsRoutes } from './routes/analytics.js';
import { healthRoutes } from './routes/health.js';

/** Сборка приложения без запуска сервера — так его удобно тестировать через app.inject(). */
export async function buildApp(config: Config, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(analyticsRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
