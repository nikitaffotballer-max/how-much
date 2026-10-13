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

/** Дата по Москве в формате «2026-10-13». */
export function moscowDateKey(date: Date): string {
  return new Date(date.getTime() + MOSCOW_OFFSET_MS).toISOString().slice(0, 10);
}

/** Начало месяца по Москве (в UTC). month может выходить за 0–11: Date.UTC сам перенесёт год. */
function moscowMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - MOSCOW_OFFSET_MS);
}

export interface MonthToDate {
  current: Period;
  /** Те же дни прошлого месяца: 1–13 октября сравниваем с 1–13 сентября. */
  previous: Period;
  /** Даты текущего периода по порядку — по ним строятся столбики «по дням». */
  days: string[];
}

export function monthToDate(now: Date): MonthToDate {
  const local = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();

  const currentFrom = moscowMonthStart(year, month);
  const previousFrom = moscowMonthStart(year, month - 1);
  const elapsed = now.getTime() - currentFrom.getTime();
  // Если прошлый месяц короче (31 марта → февраль), не залезаем в текущий.
  const previousTo = new Date(Math.min(previousFrom.getTime() + elapsed, currentFrom.getTime()));

  const days = Array.from({ length: local.getUTCDate() }, (_, i) =>
    moscowDateKey(new Date(currentFrom.getTime() + i * DAY_MS)),
  );

  return {
    current: { from: currentFrom, to: now },
    previous: { from: previousFrom, to: previousTo },
    days,
  };
}
