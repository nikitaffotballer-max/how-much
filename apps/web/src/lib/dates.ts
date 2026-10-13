const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** «Сегодня, 14:02», «Вчера, 19:15» или «11 октября». */
export function formatPurchaseTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (daysAgo === 0) return `Сегодня, ${timeFormatter.format(date)}`;
  if (daysAgo === 1) return `Вчера, ${timeFormatter.format(date)}`;
  return dayFormatter.format(date);
}

/** «2026-10-11» → 11 (день месяца для подписи столбика). */
export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}
