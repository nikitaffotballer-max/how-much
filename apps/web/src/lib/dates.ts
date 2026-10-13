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

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const fullFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Заголовок группы в списке чеков: «Сегодня», «Вчера», «суббота, 11 октября». */
export function formatDayHeading(iso: string, now: Date = new Date()): string {
  const daysAgo = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (daysAgo === 0) return 'Сегодня';
  if (daysAgo === 1) return 'Вчера';
  return weekdayFormatter.format(new Date(iso));
}

/** Ключ дня для группировки по локальной дате пользователя. */
export function localDayKey(iso: string): number {
  return startOfDay(new Date(iso));
}

/** «14:02». */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** «13 октября 2026 г. в 14:02» — для карточки чека. */
export function formatDateTime(iso: string): string {
  return fullFormatter.format(new Date(iso));
}

/** «2026-10-11» → 11 (день месяца для подписи столбика). */
export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

const relativeFormatter = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' });

/** «только что», «5 минут назад», «2 часа назад», дальше — как у покупок. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return relativeFormatter.format(-minutes, 'minute');
  if (minutes < 6 * 60) return relativeFormatter.format(-Math.floor(minutes / 60), 'hour');
  return formatPurchaseTime(iso, now).toLowerCase();
}
