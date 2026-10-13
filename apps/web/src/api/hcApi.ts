import { dashboardSummarySchema, type DashboardSummary } from '@how-much/shared';
import type { z } from 'zod';

export class HCApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HCApiError';
  }
}

/** GET-запрос к API с проверкой ответа по Zod-схеме: в компоненты попадают только валидные данные. */
async function getJson<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include' });
  if (!response.ok) {
    throw new HCApiError(response.status, `Запрос ${path} завершился с кодом ${response.status}`);
  }
  return schema.parse(await response.json());
}

export const hcApi = {
  getDashboardSummary: (): Promise<DashboardSummary> =>
    getJson('/analytics/summary', dashboardSummarySchema),
};
