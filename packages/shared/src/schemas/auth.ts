import { z } from 'zod';

/** Email приводим к нижнему регистру: «Ivan@Mail.ru» и «ivan@mail.ru» — один аккаунт. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Неверный формат email' }));

const newPasswordSchema = z
  .string()
  .min(8, { error: 'Пароль должен быть не короче 8 символов' })
  .max(128, { error: 'Пароль слишком длинный' });

export const credentialsSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

export type Credentials = z.infer<typeof credentialsSchema>;

/**
 * Вход проверяет только, что поля заполнены: правила формата и длины — для регистрации.
 * Так входит и локальный тестовый пользователь admin (см. pnpm db:seed:admin).
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, { error: 'Введите email' }),
  password: z
    .string()
    .min(1, { error: 'Введите пароль' })
    .max(128, { error: 'Пароль слишком длинный' }),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

const currentPasswordSchema = z
  .string()
  .min(1, { error: 'Введите текущий пароль' })
  .max(128, { error: 'Пароль слишком длинный' });

/** POST /api/v1/me/password. */
export const changePasswordSchema = z.object({
  currentPassword: currentPasswordSchema,
  newPassword: newPasswordSchema,
});

export type ChangePassword = z.infer<typeof changePasswordSchema>;

/** DELETE /api/v1/me: удаление необратимо, поэтому просим пароль ещё раз. */
export const deleteAccountSchema = z.object({ password: currentPasswordSchema });

export type DeleteAccount = z.infer<typeof deleteAccountSchema>;

/** Ответ GET /api/v1/me и успешных /auth/register, /auth/login. */
export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  plan: z.enum(['free', 'pro']),
  subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'canceled', 'expired']).nullable(),
  /** Конец пробного или оплаченного периода; null — подписки нет. */
  periodEndsAt: z.iso.datetime().nullable(),
  /** Пользователь отменил продление: Pro работает до periodEndsAt и не продлевается. */
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

/** Единый формат ошибок API (ТЗ, раздел 8). */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
