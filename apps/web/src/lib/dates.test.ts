import { describe, expect, it } from 'vitest';
import { dayOfMonth, formatPurchaseTime, formatRelativeTime } from './dates';

describe('formatPurchaseTime', () => {
  const now = new Date(2026, 9, 13, 18, 0);

  it('сегодня — со временем', () => {
    expect(formatPurchaseTime(new Date(2026, 9, 13, 14, 2).toISOString(), now)).toBe(
      'Сегодня, 14:02',
    );
  });

  it('вчера — со временем', () => {
    expect(formatPurchaseTime(new Date(2026, 9, 12, 19, 15).toISOString(), now)).toBe(
      'Вчера, 19:15',
    );
  });

  it('раньше — только дата', () => {
    expect(formatPurchaseTime(new Date(2026, 9, 11, 10, 20).toISOString(), now)).toBe('11 октября');
  });
});

describe('dayOfMonth', () => {
  it('берёт число из ISO-даты', () => {
    expect(dayOfMonth('2026-10-07')).toBe(7);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date(2026, 9, 13, 18, 0);
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it('свежие события — в минутах и часах', () => {
    expect(formatRelativeTime(minutesAgo(0), now)).toBe('только что');
    expect(formatRelativeTime(minutesAgo(5), now)).toBe('5 минут назад');
    expect(formatRelativeTime(minutesAgo(120), now)).toBe('2 часа назад');
  });

  it('давние — датой', () => {
    expect(formatRelativeTime(new Date(2026, 9, 11, 10, 20).toISOString(), now)).toBe('11 октября');
  });
});
