import { describe, expect, it } from 'vitest';
import { formatRub, formatSignedPercent, NBSP, shareOf } from './money.js';

describe('formatRub', () => {
  it('переводит копейки в рубли с неразрывными пробелами', () => {
    expect(formatRub(3_842_000)).toBe(`38${NBSP}420${NBSP}₽`);
  });

  it('округляет копейки', () => {
    expect(formatRub(81_749)).toBe(`817${NBSP}₽`);
  });
});

describe('formatSignedPercent', () => {
  it('показывает типографский минус', () => {
    expect(formatSignedPercent(-0.06)).toBe('−6%');
  });

  it('показывает плюс и дробную часть через запятую', () => {
    expect(formatSignedPercent(0.048, 1)).toBe('+4,8%');
  });

  it('ноль без знака', () => {
    expect(formatSignedPercent(0.0001)).toBe('0%');
  });
});

describe('shareOf', () => {
  it('считает долю в процентах', () => {
    expect(shareOf(1_694_000, 3_842_000)).toBe(44);
  });

  it('не делит на ноль', () => {
    expect(shareOf(100, 0)).toBe(0);
  });
});
