/**
 * Тарифы и проверка доступа (ТЗ, раздел 4). Вся логика «что можно на каком тарифе»
 * живёт здесь, чтобы бэкенд и фронтенд не расходились.
 */
export type Plan = 'free' | 'pro';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export type Feature =
  | 'dashboardPeriods'
  | 'itemCategories'
  | 'personalInflation'
  | 'askQuestions'
  | 'budgets'
  | 'bankStatements'
  | 'export'
  | 'monthlyReport';

export interface PlanLimits {
  mailAccounts: number;
  /** За сколько месяцев забираем чеки при первом подключении почты (ТЗ, 3.2). */
  importMonths: number;
  historyMonths: number | null;
  askPerDay: number;
  features: ReadonlySet<Feature>;
}

const PRO_FEATURES: ReadonlySet<Feature> = new Set<Feature>([
  'dashboardPeriods',
  'itemCategories',
  'personalInflation',
  'askQuestions',
  'budgets',
  'bankStatements',
  'export',
  'monthlyReport',
]);

export const HC_PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { mailAccounts: 1, importMonths: 3, historyMonths: 3, askPerDay: 0, features: new Set() },
  pro: {
    mailAccounts: 5,
    importMonths: 12,
    historyMonths: null,
    askPerDay: 50,
    features: PRO_FEATURES,
  },
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

/** Как назвать функцию в предложении перейти на Pro: «… доступны в Pro». */
export const HC_FEATURE_NAMES: Record<Feature, string> = {
  dashboardPeriods: 'Любые периоды на дашборде',
  itemCategories: 'Категории по товарам',
  personalInflation: 'Личная инфляция',
  askQuestions: 'Вопросы обычным языком',
  budgets: 'Бюджеты',
  bankStatements: 'Импорт банковских выписок',
  export: 'Экспорт',
  monthlyReport: 'Отчёт за месяц',
};

/** Пробный Pro при регистрации (ТЗ, раздел 4). */
export const HC_TRIAL_DAYS = 14;

/** Цены Pro в копейках (ТЗ, раздел 4). */
export const HC_PRO_PRICES = { month: 24_900, year: 239_000 } as const;
