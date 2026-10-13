import { describe, expect, it } from 'vitest';
import { generateDemoReceipts } from './demoData.js';

describe('generateDemoReceipts', () => {
  const now = new Date('2026-10-13T12:00:00Z');

  it('при одинаковой дате выдаёт одинаковые данные', () => {
    expect(generateDemoReceipts(now)).toEqual(generateDemoReceipts(now));
  });

  it('итог каждого чека равен сумме строк', () => {
    for (const receipt of generateDemoReceipts(now)) {
      expect(receipt.total).toBe(receipt.items.reduce((sum, item) => sum + item.sum, 0));
    }
  });

  it('покрывает прошлый и текущий месяц и не заглядывает в будущее', () => {
    const receipts = generateDemoReceipts(now);
    const dates = receipts.map((r) => r.purchasedAt.getTime());
    expect(Math.min(...dates)).toBeGreaterThanOrEqual(Date.parse('2026-08-31T21:00:00Z'));
    expect(Math.max(...dates)).toBeLessThanOrEqual(now.getTime());
    expect(receipts.length).toBeGreaterThan(40);
  });
});
