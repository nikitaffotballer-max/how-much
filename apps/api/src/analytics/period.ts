import type { DashboardQuery } from '@how-much/shared';

/**
 * Пока все пользователи считаются в московском времени: Москва живёт в UTC+3 круглый год
 * (без перехода на летнее время с 2014 года). Часовой пояс в профиле — отдельная задача.
 */
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Полуинтервал [from, to). */
export interface Period {
  from: Date;
  to: Date;
}

export interface DashboardRange {
  current: Period;
  /** С чем сравниваем: такой же отрезок перед текущим. */
  previous: Period;
  /** Даты текущего периода по порядку — по ним строятся столбики «по дням». */
  days: string[];
}

/** Дата по Москве в формате «2026-10-13». */
export function moscowDateKey(date: Date): string {
  return new Date(date.getTime() + MOSCOW_OFFSET_MS).toISOString().slice(0, 10);
}

/** Полночь по Москве для даты «2026-10-13» (в UTC). */
function moscowDayStart(dateKey: string): Date {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - MOSCOW_OFFSET_MS);
}

/** Начало месяца по Москве (в UTC). month может выходить за 0–11: Date.UTC сам перенесёт год. */
function moscowMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - MOSCOW_OFFSET_MS);
}

function shift(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function daysBetween(from: Date, to: Date): string[] {
  const count = Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
  return Array.from({ length: count }, (_, i) => moscowDateKey(shift(from, i * DAY_MS)));
}

/**
 * Незаконченный период (сегодня, эта неделя) сравниваем с тем же отрезком предыдущего:
 * понедельник–среда этой недели — с понедельником–средой прошлой, а не со всей неделей.
 */
function toDate(from: Date, now: Date, previousFrom: Date, previousCap: Date): DashboardRange {
  const elapsed = now.getTime() - from.getTime();
  return {
    current: { from, to: now },
    previous: {
      from: previousFrom,
      to: new Date(Math.min(previousFrom.getTime() + elapsed, previousCap.getTime())),
    },
    days: daysBetween(from, now),
  };
}

export function monthToDate(now: Date): DashboardRange {
  const local = shift(now, MOSCOW_OFFSET_MS);
  const from = moscowMonthStart(local.getUTCFullYear(), local.getUTCMonth());
  const previousFrom = moscowMonthStart(local.getUTCFullYear(), local.getUTCMonth() - 1);
  // Если прошлый месяц короче (31 марта → февраль), не залезаем в текущий.
  return toDate(from, now, previousFrom, from);
}

export function weekToDate(now: Date): DashboardRange {
  const today = moscowDayStart(moscowDateKey(now));
  // getUTCDay: воскресенье — 0; неделя в России начинается с понедельника.
  const weekday = (shift(today, MOSCOW_OFFSET_MS).getUTCDay() + 6) % 7;
  const from = shift(today, -weekday * DAY_MS);
  return toDate(from, now, shift(from, -7 * DAY_MS), from);
}

export function dayToDate(now: Date): DashboardRange {
  const from = moscowDayStart(moscowDateKey(now));
  return toDate(from, now, shift(from, -DAY_MS), from);
}

/** Произвольные даты включительно; сравнение — с таким же числом дней прямо перед ними. */
export function customRange(fromKey: string, toKey: string): DashboardRange {
  const from = moscowDayStart(fromKey);
  const to = shift(moscowDayStart(toKey), DAY_MS);
  const length = to.getTime() - from.getTime();
  return {
    current: { from, to },
    previous: { from: shift(from, -length), to: from },
    days: daysBetween(from, to),
  };
}

export function resolveRange(query: DashboardQuery, now: Date): DashboardRange {
  switch (query.period) {
    case 'day':
      return dayToDate(now);
    case 'week':
      return weekToDate(now);
    case 'month':
      return monthToDate(now);
    case 'custom':
      return customRange(query.from, query.to);
  }
}
