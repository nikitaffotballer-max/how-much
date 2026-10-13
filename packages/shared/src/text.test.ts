import { describe, expect, it } from 'vitest';
import { plural } from './text.js';

const DAYS: [string, string, string] = ['день', 'дня', 'дней'];

describe('plural', () => {
  it.each([
    [1, 'день'],
    [2, 'дня'],
    [5, 'дней'],
    [11, 'дней'],
    [12, 'дней'],
    [14, 'дней'],
    [21, 'день'],
    [22, 'дня'],
    [0, 'дней'],
  ])('%i → %s', (count, expected) => {
    expect(plural(count, DAYS)).toBe(expected);
  });
});
