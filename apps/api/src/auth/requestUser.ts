import type { FastifyInstance, FastifyRequest } from 'fastify';
import { unauthorized } from '../errors.js';
import { resolveSession, SESSION_COOKIE } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** id вошедшего пользователя или null для гостя. Заполняется до обработчика маршрута. */
    userId: string | null;
  }
}

/** На каждом запросе определяем пользователя по cookie сессии. */
export function registerRequestUser(app: FastifyInstance) {
  app.decorateRequest('userId', null);

  app.addHook('preHandler', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.userId = token ? await resolveSession(app.db, token) : null;
  });
}

/** Для закрытых маршрутов: вернёт id пользователя или ответит 401. */
export function requireUserId(request: FastifyRequest): string {
  if (!request.userId) throw unauthorized();
  return request.userId;
}
