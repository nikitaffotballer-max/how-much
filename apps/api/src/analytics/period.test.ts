import { describe, expect, it } from 'vitest';
import { customRange, dayToDate, monthToDate, moscowDateKey, weekToDate } from './period.js';

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

describe('weekToDate', () => {
  it('неделя начинается с понедельника по Москве', () => {
    // Среда, 14 октября 2026, 12:00 по Москве.
    const now = new Date('2026-10-14T09:00:00Z');
    const { current, previous, days } = weekToDate(now);

    expect(current.from.toISOString()).toBe('2026-10-11T21:00:00.000Z');
    expect(days).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(previous.from.toISOString()).toBe('2026-10-04T21:00:00.000Z');
    expect(previous.to.toISOString()).toBe('2026-10-07T09:00:00.000Z');
  });

  it('в воскресенье неделя ещё не закончилась', () => {
    const { days } = weekToDate(new Date('2026-10-18T20:00:00Z'));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-10-12');
  });
});

describe('dayToDate', () => {
  it('сравнивает сегодня со вчера до того же часа', () => {
    const now = new Date('2026-10-13T09:00:00Z');
    const { current, previous, days } = dayToDate(now);

    expect(current.from.toISOString()).toBe('2026-10-12T21:00:00.000Z');
    expect(previous.to.toISOString()).toBe('2026-10-12T09:00:00.000Z');
    expect(days).toEqual(['2026-10-13']);
  });
});

describe('customRange', () => {
  it('включает обе даты и сравнивает с таким же отрезком перед ними', () => {
    const { current, previous, days } = customRange('2026-09-01', '2026-09-30');

    expect(days).toHaveLength(30);
    expect(current.to.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(previous.from.toISOString()).toBe('2026-08-01T21:00:00.000Z');
    expect(previous.to).toEqual(current.from);
  });
});
