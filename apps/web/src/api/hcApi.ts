import {
  apiErrorSchema,
  currentUserSchema,
  dashboardSummarySchema,
  mailAccountListSchema,
  mailAccountSchema,
  type ConnectMailAccount,
  type Credentials,
  type LoginCredentials,
  type CurrentUser,
  type DashboardSummary,
} from '@how-much/shared';
import { z } from 'zod';

export class HCApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HCApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
}

/**
 * Запрос к API. Ответ проверяется по Zod-схеме — в компоненты попадают только валидные данные.
 * Ошибки API приходят в формате { code, message } и превращаются в HCApiError.
 */
async function request<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  { method = 'GET', body }: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = apiErrorSchema.safeParse(data);
    throw new HCApiError(
      response.status,
      error.success ? error.data.code : 'unknown_error',
      error.success ? error.data.message : `Сервер ответил с кодом ${response.status}`,
    );
  }

  return schema.parse(data);
}

/** Пустой ответ (204 No Content, 202 Accepted). */
const noContent = z.null();

export const hcApi = {
  /** Текущий пользователь или null, если не вошёл. */
  getCurrentUser: async (): Promise<CurrentUser | null> => {
    try {
      return await request('/me', currentUserSchema);
    } catch (error) {
      if (error instanceof HCApiError && error.status === 401) return null;
      throw error;
    }
  },
  register: (credentials: Credentials) =>
    request('/auth/register', currentUserSchema, { method: 'POST', body: credentials }),
  login: (credentials: LoginCredentials) =>
    request('/auth/login', currentUserSchema, { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', noContent, { method: 'POST' }),
  getDashboardSummary: (): Promise<DashboardSummary> =>
    request('/analytics/summary', dashboardSummarySchema),
  getMailAccounts: () => request('/mail-accounts', mailAccountListSchema),
  connectMailAccount: (body: ConnectMailAccount) =>
    request('/mail-accounts', mailAccountSchema, { method: 'POST', body }),
  deleteMailAccount: (id: string) =>
    request(`/mail-accounts/${id}`, noContent, { method: 'DELETE' }),
  syncMailAccount: (id: string) =>
    request(`/mail-accounts/${id}/sync`, noContent, { method: 'POST' }),
};
