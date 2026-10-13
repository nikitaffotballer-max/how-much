import { describe, expect, it } from 'vitest';
import { checkReceipt } from './checkReceipt.js';
import { EXTRACTED_RECEIPT } from './fixtures/extractedReceipt.js';

describe('checkReceipt', () => {
  it('переводит рубли в копейки и время в UTC', () => {
    const result = checkReceipt(EXTRACTED_RECEIPT);
    if (!result.ok) throw new Error(result.reason);

    expect(result.receipt.totalKopecks).toBe(60652);
    expect(result.receipt.items.map((item) => item.sumKopecks)).toEqual([
      17998, 5490, 17264, 19900,
    ]);
    expect(result.receipt.purchasedAt.toISOString()).toBe('2026-10-13T11:02:00.000Z');
  });

  it('не принимает чек, если сумма позиций не сходится с итогом', () => {
    const result = checkReceipt({ ...EXTRACTED_RECEIPT, total: 700 });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('не сходится') });
  });

  it('копеечное расхождение из-за округлений допускает', () => {
    expect(checkReceipt({ ...EXTRACTED_RECEIPT, total: 606.9 }).ok).toBe(true);
  });

  it('без даты, итога или позиций — ошибка с понятной причиной', () => {
    expect(checkReceipt({ ...EXTRACTED_RECEIPT, purchasedAt: 'вчера' })).toMatchObject({
      ok: false,
    });
    expect(checkReceipt({ ...EXTRACTED_RECEIPT, items: [] })).toMatchObject({ ok: false });
  });
});
