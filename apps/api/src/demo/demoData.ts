/**
 * Генератор демо-покупок: правдоподобные чеки за прошлый и текущий месяц.
 * Генератор детерминированный — при одинаковом «сегодня» данные всегда одинаковые.
 */

export interface DemoMerchant {
  name: string;
  /** Ключ категории по умолчанию из справочника. */
  categoryKey: string;
}

export interface DemoProduct {
  rawName: string;
  normalizedName: string;
  baseName: string;
  categoryKey: string;
  /** Цена за штуку/упаковку в копейках. */
  price: number;
}

export interface DemoReceipt {
  merchant: string;
  source: 'email' | 'cash';
  purchasedAt: Date;
  items: { product: DemoProduct; quantity: number; sum: number }[];
  total: number;
}

const product = (
  rawName: string,
  normalizedName: string,
  baseName: string,
  categoryKey: string,
  rubles: number,
): DemoProduct => ({ rawName, normalizedName, baseName, categoryKey, price: rubles * 100 });

const GROCERIES: DemoProduct[] = [
  product(
    'МОЛ.ПАСТ.ПРОСТОКВ.3,2%930Г',
    'Молоко Простоквашино 3,2%, 930 г',
    'Молоко',
    'groceries.dairy',
    119,
  ),
  product('СЫР РОССИЙСК.50% 300Г', 'Сыр Российский 50%, 300 г', 'Сыр', 'groceries.dairy', 308),
  product('ЙОГ.ГРЕЧ.2% 140Г', 'Йогурт греческий 2%, 140 г', 'Йогурт', 'groceries.dairy', 59),
  product('ЯЙЦО КУР.С1 10ШТ', 'Яйца куриные С1, 10 шт', 'Яйца', 'groceries.dairy', 109),
  product('ХЛЕБ БОРОДИН.ФОРМ.300Г', 'Хлеб Бородинский, 300 г', 'Хлеб', 'groceries.bread', 62),
  product('ГРЕЧКА ЯДР.900Г', 'Гречка ядрица, 900 г', 'Гречка', 'groceries.bread', 95),
  product('ФИЛЕ ЦБ ОХЛ.ПОДНОС', 'Куриное филе, 800 г', 'Куриное филе', 'groceries.meat', 359),
  product('БАНАНЫ ВЕС', 'Бананы, 1 кг', 'Бананы', 'groceries.produce', 139),
  product('ТОМАТЫ ЧЕРРИ 250Г', 'Томаты черри, 250 г', 'Томаты черри', 'groceries.produce', 159),
  product('ШОКОЛАД МОЛ.90Г', 'Шоколад молочный, 90 г', 'Шоколад', 'groceries.sweets', 89),
  product('ВОДА МИН.Н/ГАЗ 1,5Л', 'Вода минеральная, 1,5 л', 'Вода', 'groceries.drinks', 65),
  product(
    'СР-ВО Д/ПОСУДЫ 450МЛ',
    'Средство для мытья посуды, 450 мл',
    'Средство для посуды',
    'home.cleaning',
    179,
  ),
];

const CAFE: DemoProduct[] = [
  product('КАПУЧИНО 300МЛ', 'Капучино, 300 мл', 'Капучино', 'cafe.coffee', 280),
  product('ЛАТТЕ 400МЛ', 'Латте, 400 мл', 'Латте', 'cafe.coffee', 300),
  product('КРУАССАН', 'Круассан', 'Круассан', 'cafe.coffee', 190),
];

const MARKETPLACE: DemoProduct[] = [
  product('Кофе в зёрнах 1 кг', 'Кофе в зёрнах, 1 кг', 'Кофе в зёрнах', 'groceries.drinks', 1820),
  product(
    'Губки для посуды 10 шт',
    'Губки для посуды, 10 шт',
    'Губки для посуды',
    'home.cleaning',
    290,
  ),
  product('Органайзер для ящиков', 'Органайзер для ящиков', 'Органайзер', 'home.goods', 690),
  product('Книга «Атомные привычки»', 'Книга «Атомные привычки»', 'Книга', 'other', 790),
];

const HEALTH: DemoProduct[] = [
  product('Общий анализ крови', 'Общий анализ крови', 'Анализ крови', 'health.lab', 1200),
  product('Витамин D3 60 капс', 'Витамин D3, 60 капсул', 'Витамин D3', 'health.pharmacy', 890),
];

const MARKET_CASH = product('Овощи с рынка', 'Овощи с рынка', 'Овощи', 'groceries.produce', 0);

export const DEMO_MERCHANTS: DemoMerchant[] = [
  { name: 'Пятёрочка', categoryKey: 'groceries' },
  { name: 'ВкусВилл', categoryKey: 'groceries' },
  { name: 'Магнит', categoryKey: 'groceries' },
  { name: 'Кофейня на Лесной', categoryKey: 'cafe' },
  { name: 'Ozon', categoryKey: 'marketplaces' },
  { name: 'Инвитро', categoryKey: 'health' },
];

/** Простой детерминированный генератор псевдослучайных чисел (mulberry32). */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

export function generateDemoReceipts(now: Date, seed = 2026): DemoReceipt[] {
  const random = createRandom(seed);
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]!;
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const receipts: DemoReceipt[] = [];
  const add = (
    merchant: string,
    source: DemoReceipt['source'],
    at: Date,
    products: DemoProduct[],
  ) => {
    const items = products.map((p) => {
      const quantity = p.price === 0 ? 1 : between(1, 2);
      const sum = p.price === 0 ? between(600, 1500) * 100 : p.price * quantity;
      return { product: p, quantity, sum };
    });
    receipts.push({
      merchant,
      source,
      purchasedAt: at,
      items,
      total: items.reduce((s, i) => s + i.sum, 0),
    });
  };

  // С 1-го числа прошлого месяца по Москве до сегодняшнего дня.
  const local = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - MOSCOW_OFFSET_MS;

  for (let dayStart = start; dayStart <= now.getTime(); dayStart += DAY_MS) {
    const at = (hour: number) => {
      const time = new Date(dayStart + hour * 60 * 60 * 1000 + between(0, 59) * 60 * 1000);
      return time > now ? null : time;
    };
    const shop = (chance: number, hours: [number, number], run: (time: Date) => void) => {
      if (random() >= chance) return;
      const time = at(between(...hours));
      if (time) run(time);
    };

    shop(0.6, [9, 21], (t) => {
      const products = [...new Set(Array.from({ length: between(3, 8) }, () => pick(GROCERIES)))];
      add(pick(['Пятёрочка', 'Пятёрочка', 'ВкусВилл', 'Магнит']), 'email', t, products);
    });
    shop(0.45, [8, 10], (t) => add('Кофейня на Лесной', 'email', t, [pick(CAFE)]));
    shop(0.12, [10, 20], (t) => {
      const products = [...new Set(Array.from({ length: between(1, 2) }, () => pick(MARKETPLACE)))];
      add('Ozon', 'email', t, products);
    });
    shop(0.04, [8, 12], (t) => add('Инвитро', 'email', t, [pick(HEALTH)]));
    shop(0.08, [11, 15], (t) => add('Рынок', 'cash', t, [MARKET_CASH]));
  }

  return receipts;
}
