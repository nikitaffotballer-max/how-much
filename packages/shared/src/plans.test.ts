import { describe, expect, it } from 'vitest';
import { can, effectivePlan } from './plans.js';

describe('effectivePlan', () => {
  it.each([
    ['trialing', 'pro'],
    ['active', 'pro'],
    ['past_due', 'pro'],
    ['canceled', 'pro'],
    ['expired', 'free'],
  ] as const)('статус %s → тариф %s', (status, plan) => {
    expect(effectivePlan({ subscriptionStatus: status })).toBe(plan);
  });

  it('без подписки — Free', () => {
    expect(effectivePlan({ subscriptionStatus: null })).toBe('free');
  });
});

describe('can', () => {
  it('Pro-функция недоступна на Free', () => {
    expect(can({ subscriptionStatus: null }, 'personalInflation')).toBe(false);
  });

  it('периоды дашборда — только в Pro', () => {
    expect(can({ subscriptionStatus: 'expired' }, 'dashboardPeriods')).toBe(false);
    expect(can({ subscriptionStatus: 'active' }, 'dashboardPeriods')).toBe(true);
  });

  it('Pro-функция доступна в пробный период', () => {
    expect(can({ subscriptionStatus: 'trialing' }, 'personalInflation')).toBe(true);
  });
});
