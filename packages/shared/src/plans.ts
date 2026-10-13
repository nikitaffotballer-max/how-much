/**
 * Тарифы и проверка доступа (ТЗ, раздел 4). Вся логика «что можно на каком тарифе»
 * живёт здесь, чтобы бэкенд и фронтенд не расходились.
 */
export type Plan = 'free' | 'pro';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export type Feature =
  | 'itemCategories'
  | 'personalInflation'
  | 'askQuestions'
  | 'budgets'
  | 'bankStatements'
  | 'export'
  | 'monthlyReport';

export interface PlanLimits {
  mailAccounts: number;
  historyMonths: number | null;
  askPerDay: number;
  features: ReadonlySet<Feature>;
}

const PRO_FEATURES: ReadonlySet<Feature> = new Set<Feature>([
  'itemCategories',
  'personalInflation',
  'askQuestions',
  'budgets',
  'bankStatements',
  'export',
  'monthlyReport',
]);

export const HC_PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { mailAccounts: 1, historyMonths: 3, askPerDay: 0, features: new Set() },
  pro: { mailAccounts: 5, historyMonths: null, askPerDay: 50, features: PRO_FEATURES },
};

export interface AccessSubject {
  subscriptionStatus: SubscriptionStatus | null;
}

/** Статусы, при которых Pro ещё работает: пробный период, оплачено, идут повторы, отменено до конца периода. */
const PRO_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'trialing',
  'active',
  'past_due',
  'canceled',
]);

export function effectivePlan(subject: AccessSubject): Plan {
  return subject.subscriptionStatus && PRO_STATUSES.has(subject.subscriptionStatus)
    ? 'pro'
    : 'free';
}

export function can(subject: AccessSubject, feature: Feature): boolean {
  return HC_PLAN_LIMITS[effectivePlan(subject)].features.has(feature);
}
