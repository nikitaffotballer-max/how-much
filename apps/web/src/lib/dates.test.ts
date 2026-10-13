import { describe, expect, it } from 'vitest';
import { dayOfMonth, formatPurchaseTime } from './dates';

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
