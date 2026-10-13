/** Пробелы (в том числе неразрывный — так суммы копируются из интерфейса) и знак рубля. */
const AMOUNT_NOISE = new RegExp('[\\s\\u00a0\\u20bd]', 'g');

/**
 * Сумма, которую человек ввёл руками: «1 250,50», «1250.5», «99» → копейки.
 * null — если это не похоже на сумму с не более чем двумя знаками после запятой.
 */
export function parseRublesInput(input: string): number | null {
  const normalized = input.replace(AMOUNT_NOISE, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Значение для <input type="datetime-local"> в часовом поясе пользователя. */
export function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
