import { describe, expect, it } from 'vitest';
import { parseRublesInput } from './money';

describe('parseRublesInput', () => {
  it('понимает пробелы, запятую, точку и знак рубля', () => {
    expect(parseRublesInput('1 250,50')).toBe(125_050);
    expect(parseRublesInput('1250.5')).toBe(125_050);
    expect(parseRublesInput('99 ₽')).toBe(9_900);
  });

  it('отклоняет всё, что не похоже на сумму', () => {
    expect(parseRublesInput('')).toBeNull();
    expect(parseRublesInput('12,345')).toBeNull();
    expect(parseRublesInput('сто')).toBeNull();
    expect(parseRublesInput('-5')).toBeNull();
  });
});
