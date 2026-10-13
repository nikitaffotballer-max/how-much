import { describe, expect, it } from 'vitest';
import { monthToDate, moscowDateKey } from './period.js';

describe('moscowDateKey', () => {
  it('после 21:00 UTC по Москве уже следующий день', () => {
    expect(moscowDateKey(new Date('2026-10-12T21:30:00Z'))).toBe('2026-10-13');
  });
});

describe('monthToDate', () => {
  it('сравнивает 1–13 октября с 1–13 сентября', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const { current, previous, days } = monthToDate(now);

    expect(current.from.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(previous.from.toISOString()).toBe('2026-08-31T21:00:00.000Z');
    expect(previous.to.toISOString()).toBe('2026-09-13T12:00:00.000Z');
    expect(days).toHaveLength(13);
    expect(days[0]).toBe('2026-10-01');
    expect(days.at(-1)).toBe('2026-10-13');
  });

  it('не выходит за прошлый месяц, если он короче', () => {
    const now = new Date('2026-03-31T12:00:00Z');
    const { current, previous } = monthToDate(now);
    expect(previous.to.getTime()).toBe(current.from.getTime());
  });

  it('в январе прошлый месяц — декабрь прошлого года', () => {
    const { previous } = monthToDate(new Date('2027-01-05T12:00:00Z'));
    expect(previous.from.toISOString()).toBe('2026-11-30T21:00:00.000Z');
  });
});
