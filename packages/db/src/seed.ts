import { HC_CATEGORIES, HC_CATEGORY_KEYS } from '@how-much/shared';
import { createPrismaClient } from './client.js';

/** Подкатегории второго уровня (ТЗ, 3.4). Ключ — «<родитель>.<подкатегория>». */
const SUBCATEGORIES: Record<string, string> = {
  'groceries.dairy': 'Молочное',
  'groceries.bread': 'Хлеб и крупы',
  'groceries.meat': 'Мясо и птица',
  'groceries.produce': 'Овощи и фрукты',
  'groceries.sweets': 'Сладкое',
  'groceries.drinks': 'Напитки',
  'cafe.coffee': 'Кофе с собой',
  'cafe.restaurants': 'Рестораны и доставка еды',
  'health.pharmacy': 'Аптека',
  'health.lab': 'Анализы и клиники',
  'home.cleaning': 'Бытовая химия',
  'home.goods': 'Товары для дома',
};

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL не задан');
  const prisma = createPrismaClient(databaseUrl);

  try {
    // upsert — сид можно запускать повторно, данные не задвоятся.
    for (const key of HC_CATEGORY_KEYS) {
      await prisma.category.upsert({
        where: { key },
        update: { name: HC_CATEGORIES[key].name },
        create: { key, name: HC_CATEGORIES[key].name },
      });
    }

    for (const [key, name] of Object.entries(SUBCATEGORIES)) {
      const parentKey = key.split('.')[0]!;
      const parent = await prisma.category.findUniqueOrThrow({ where: { key: parentKey } });
      await prisma.category.upsert({
        where: { key },
        update: { name, parentId: parent.id },
        create: { key, name, parentId: parent.id },
      });
    }

    const count = await prisma.category.count();
    console.log(`Категории готовы: ${count}`);
  } finally {
    await prisma.$disconnect();
  }
}

await seed();
