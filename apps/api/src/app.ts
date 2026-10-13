import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createPrismaClient, type PrismaClient } from '@how-much/db';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { registerRequestUser } from './auth/requestUser.js';
import type { Config } from './config.js';
import { registerErrorHandler } from './errors.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
    hcConfig: Config;
  }
}

/** Сборка приложения без запуска сервера — так его удобно тестировать через app.inject(). */
export async function buildApp(config: Config, options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  const db = createPrismaClient(config.DATABASE_URL);

  app.decorate('db', db);
  app.decorate('hcConfig', config);
  app.addHook('onClose', () => db.$disconnect());

  registerErrorHandler(app);
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  // global: false — лимит включается только там, где задан в config маршрута (вход, регистрация).
  await app.register(rateLimit, { global: false });
  registerRequestUser(app);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(analyticsRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
