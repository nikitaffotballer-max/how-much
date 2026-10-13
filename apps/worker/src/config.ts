import { encryptionKeyEnvSchema } from '@how-much/mail';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL обязателен' }),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MAIL_ENCRYPTION_KEY: encryptionKeyEnvSchema,
});

export type WorkerConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Некорректные переменные окружения:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
