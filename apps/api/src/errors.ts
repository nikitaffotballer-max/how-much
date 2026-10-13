import type { ApiError } from '@how-much/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/** Ошибка, которую можно показать клиенту: статус, машинный код и текст для человека. */
export class HCHttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HCHttpError';
  }
}

export const unauthorized = () => new HCHttpError(401, 'unauthorized', 'Нужно войти в аккаунт');

/** Все ошибки приводим к формату { code, message, details? } из ТЗ. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError | HCHttpError | ZodError>((error, request, reply) => {
    if (error instanceof ZodError) {
      const body: ApiError = {
        code: 'validation_error',
        message: error.issues[0]?.message ?? 'Некорректные данные',
        details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      };
      return reply.status(400).send(body);
    }

    if (error instanceof HCHttpError) {
      const body: ApiError = { code: error.code, message: error.message, details: error.details };
      return reply.status(error.statusCode).send(body);
    }

    // Ошибки самого Fastify (429 от rate limit, 415 и т. п.) пропускаем со своим статусом.
    if (error.statusCode && error.statusCode < 500) {
      return reply
        .status(error.statusCode)
        .send({ code: error.code ?? 'request_error', message: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ code: 'internal_error', message: 'Что-то пошло не так' });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({ code: 'not_found', message: `Маршрут ${request.url} не найден` }),
  );
}
