import type { PrismaClient } from '@how-much/db';
import {
  can,
  effectivePlan,
  HC_FEATURE_NAMES,
  HC_PLAN_LIMITS,
  type Feature,
} from '@how-much/shared';
import { HCHttpError } from '../errors.js';

/**
 * Проверка Pro-функции (ТЗ, раздел 4): 402 с кодом функции в details —
 * по нему фронтенд понимает, что предложить.
 */
export async function requireFeature(db: PrismaClient, userId: string, feature: Feature) {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (!can({ subscriptionStatus: subscription?.status ?? null }, feature)) {
    throw new HCHttpError(402, 'pro_required', `${HC_FEATURE_NAMES[feature]} — в Pro`, {
      feature,
    });
  }
}

/**
 * С какой даты показываем историю: на Free — за последние N месяцев, в Pro — всю.
 * Старые чеки не удаляем: после перехода на Pro они снова видны (ТЗ, раздел 4).
 */
export async function historyStart(
  db: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<Date | null> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  const months =
    HC_PLAN_LIMITS[effectivePlan({ subscriptionStatus: subscription?.status ?? null })]
      .historyMonths;
  if (months === null) return null;
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  return start;
}
