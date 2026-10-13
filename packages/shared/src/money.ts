/** Деньги храним в копейках (целые числа), чтобы не ловить ошибки округления float. */
export type Kopecks = number;

/** Неразрывный пробел: сумма и знак рубля не разъезжаются по разным строкам. */
export const NBSP = String.fromCharCode(0xa0);

const rubFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 3842000 → «38 420 ₽». Копейки отбрасываются округлением: в интерфейсе они не нужны. */
export function formatRub(amount: Kopecks): string {
  return `${rubFormatter.format(Math.round(amount / 100))}${NBSP}₽`;
}

/** -0.06 → «−6%», 0.048 → «+4,8%». Знак всегда виден, минус — типографский. */
export function formatSignedPercent(ratio: number, fractionDigits = 0): string {
  const value = Math.abs(ratio * 100);
  if (Number(value.toFixed(fractionDigits)) === 0) return '0%';

  const text = value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${ratio < 0 ? '−' : '+'}${text}%`;
}

/** Доля от целого в процентах для подписей: 16940 из 38420 → 44. */
export function shareOf(part: Kopecks, total: Kopecks): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
