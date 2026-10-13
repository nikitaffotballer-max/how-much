import { describe, expect, it } from 'vitest';
import { formatDateRange, periodLabels, readPeriodQuery, writePeriodQuery } from './periods';

describe('formatDateRange', () => {
  it('внутри месяца пишет месяц один раз', () => {
    expect(formatDateRange({ from: '2026-09-01', to: '2026-09-03' })).toBe('1–3 сентября');
  });

  it('между месяцами — оба месяца', () => {
    expect(formatDateRange({ from: '2026-08-30', to: '2026-09-02' })).toBe(
      '30 августа – 2 сентября',
    );
  });

  it('между годами — с годами', () => {
    expect(formatDateRange({ from: '2026-12-28', to: '2027-01-03' })).toBe(
      '28 декабря 2026 – 3 января 2027 г.',
    );
  });

  it('один день — просто дата', () => {
    expect(formatDateRange({ from: '2026-09-05', to: '2026-09-05' })).toBe('5 сентября');
  });
});

describe('periodLabels', () => {
  it('для своего периода называет даты', () => {
    const labels = periodLabels({
      period: { kind: 'custom', from: '2026-09-01', to: '2026-09-03' },
      previousPeriod: { from: '2026-08-29', to: '2026-08-31' },
    });
    expect(labels.title).toBe('Потрачено за 1–3 сентября');
    expect(labels.comparedTo).toBe('чем за 29–31 августа');
  });
});

describe('readPeriodQuery', () => {
  it('без параметров и с мусором — месяц', () => {
    expect(readPeriodQuery(new URLSearchParams())).toEqual({ period: 'month' });
    expect(readPeriodQuery(new URLSearchParams('period=year'))).toEqual({ period: 'month' });
    expect(readPeriodQuery(new URLSearchParams('period=custom&from=2026-09-01'))).toEqual({
      period: 'month',
    });
  });

  it('читает неделю и свой период', () => {
    expect(readPeriodQuery(new URLSearchParams('period=week'))).toEqual({ period: 'week' });
    const custom = { period: 'custom', from: '2026-09-01', to: '2026-09-03' } as const;
    expect(readPeriodQuery(writePeriodQuery(custom))).toEqual(custom);
  });
});
