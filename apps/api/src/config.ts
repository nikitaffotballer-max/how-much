import { encryptionKeyEnvSchema } from '@how-much/mail';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  /** Локально слушаем только свой компьютер; в Docker/на сервере задаём 0.0.0.0. */
  API_HOST: z.string().default('127.0.0.1'),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL обязателен' }),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /** Ключ шифрования паролей приложений от почты (AES-256-GCM): 32 байта в base64. */
  MAIL_ENCRYPTION_KEY: encryptionKeyEnvSchema,
  /** Email демо-аккаунта. Не задан — кнопка «Посмотреть демо» отключена. */
  DEMO_EMAIL: z.email().optional(),
});

export type Config = z.infer<typeof envSchema>;

/** Падаем на старте с понятной ошибкой, а не посреди запроса из-за пустой переменной. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Некорректные переменные окружения:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
