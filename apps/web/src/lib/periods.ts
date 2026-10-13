import { dashboardQuerySchema, type DashboardQuery, type DashboardSummary } from '@how-much/shared';

type Kind = DashboardQuery['period'];
type Range = { from: string; to: string };

// Даты периода — календарные дни, без времени: форматируем в UTC, чтобы пояс браузера не сдвинул день.
const dayMonth = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayOnly = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', timeZone: 'UTC' });

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

/** «1–3 сентября», «30 августа – 2 сентября», «28 декабря 2026 – 3 января 2027 г.». */
export function formatDateRange({ from, to }: Range): string {
  const a = toDate(from);
  const b = toDate(to);
  if (from === to) return dayMonth.format(a);
  if (from.slice(0, 4) !== to.slice(0, 4)) {
    return `${dayMonthYear.format(a).replace(' г.', '')} – ${dayMonthYear.format(b)}`;
  }
  if (from.slice(0, 7) === to.slice(0, 7)) return `${dayOnly.format(a)}–${dayMonth.format(b)}`;
  return `${dayMonth.format(a)} – ${dayMonth.format(b)}`;
}

/** Подписи, которые зависят от периода: заголовок итога, сравнение, короткая фраза. */
export interface PeriodLabels {
  /** «Потрачено с начала месяца». */
  title: string;
  /** «к прошлому месяцу» — рядом с процентом. */
  versus: string;
  /** «чем за те же дни прошлого месяца» — после «на 1 200 ₽ меньше». */
  comparedTo: string;
  /** «в прошлом месяце» — для среднего чека. */
  previously: string;
  /** «с начала месяца» — внутри фраз. */
  phrase: string;
}

export function periodLabels(summary: Pick<DashboardSummary, 'period' | 'previousPeriod'>) {
  const byKind: Record<Kind, PeriodLabels> = {
    day: {
      title: 'Потрачено сегодня',
      versus: 'ко вчера',
      comparedTo: 'чем вчера к этому времени',
      previously: 'вчера',
      phrase: 'сегодня',
    },
    week: {
      title: 'Потрачено на этой неделе',
      versus: 'к прошлой неделе',
      comparedTo: 'чем за те же дни прошлой недели',
      previously: 'на прошлой неделе',
      phrase: 'на этой неделе',
    },
    month: {
      title: 'Потрачено с начала месяца',
      versus: 'к прошлому месяцу',
      comparedTo: 'чем за те же дни прошлого месяца',
      previously: 'в прошлом месяце',
      phrase: 'с начала месяца',
    },
    custom: {
      title: `Потрачено за ${formatDateRange(summary.period)}`,
      versus: 'к прошлому периоду',
      comparedTo: `чем за ${formatDateRange(summary.previousPeriod)}`,
      previously: `за ${formatDateRange(summary.previousPeriod)}`,
      phrase: `за ${formatDateRange(summary.period)}`,
    },
  };
  return byKind[summary.period.kind];
}

/** Период из адресной строки (?period=week): переживает перезагрузку и кнопку «Назад». */
export function readPeriodQuery(params: URLSearchParams): DashboardQuery {
  const parsed = dashboardQuerySchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : { period: 'month' };
}

export function writePeriodQuery(query: DashboardQuery): URLSearchParams {
  // Месяц — по умолчанию, адрес без параметров чище.
  if (query.period === 'month') return new URLSearchParams();
  return new URLSearchParams(query);
}
