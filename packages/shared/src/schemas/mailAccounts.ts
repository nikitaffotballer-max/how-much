import { z } from 'zod';
import { HC_MAIL_PROVIDER_KEYS } from '../mailProviders.js';
import { emailSchema } from './auth.js';

export const mailAccountStatusSchema = z.enum(['active', 'auth_failed', 'disabled']);

/** Элемент ответа GET /api/v1/mail-accounts. Пароль никогда не уходит на фронтенд. */
export const mailAccountSchema = z.object({
  id: z.string(),
  provider: z.enum(HC_MAIL_PROVIDER_KEYS),
  login: z.string(),
  status: mailAccountStatusSchema,
  /** null — первая синхронизация ещё не закончилась. */
  lastSyncAt: z.iso.datetime().nullable(),
  /** Сколько писем с чеками нашли в ящике за всё время. */
  emailsFound: z.number().int().nonnegative(),
});

export type MailAccount = z.infer<typeof mailAccountSchema>;

export const mailAccountListSchema = z.array(mailAccountSchema);

/** Тело POST /api/v1/mail-accounts. */
export const connectMailAccountSchema = z.object({
  provider: z.enum(HC_MAIL_PROVIDER_KEYS, { error: 'Выберите почтовый сервис' }),
  login: emailSchema,
  // Яндекс и Google показывают пароль группами через пробел — пробелы убираем.
  appPassword: z
    .string()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(
      z
        .string()
        .min(1, { error: 'Вставьте пароль приложения' })
        .max(128, { error: 'Пароль слишком длинный' }),
    ),
});

export type ConnectMailAccount = z.input<typeof connectMailAccountSchema>;
