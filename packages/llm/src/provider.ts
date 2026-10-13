import type { z } from 'zod';

/** Запрос к модели: инструкция, данные и схема ответа. */
export interface LlmRequest<TSchema extends z.ZodType> {
  system: string;
  prompt: string;
  /** Модель обязана ответить JSON-ом по этой схеме; ответ проверяется ею же. */
  schema: TSchema;
}

/**
 * Любая модель — Claude, GigaChat, YandexGPT, локальная Ollama — подключается через этот интерфейс
 * (ТЗ, решения по LLM). Код разбора чеков не знает, какая модель отвечает.
 */
export interface LlmProvider {
  readonly name: string;
  generate<TSchema extends z.ZodType>(request: LlmRequest<TSchema>): Promise<z.infer<TSchema>>;
}

/** Модель не ответила или ответила не по схеме. */
export class HCLlmError extends Error {
  override readonly name = 'HCLlmError';
}
