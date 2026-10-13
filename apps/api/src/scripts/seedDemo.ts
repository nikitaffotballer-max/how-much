import { createPrismaClient } from '@how-much/db';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../auth/password.js';
import { loadConfig } from '../config.js';
import { DEMO_MERCHANTS, generateDemoReceipts } from '../demo/demoData.js';

/**
 * Создаёт (или пересоздаёт) демо-аккаунт с покупками за прошлый и текущий месяц.
 * Войти в него можно только кнопкой «Посмотреть демо» — пароль случайный и нигде не хранится.
 * Запуск: pnpm db:seed:demo (после pnpm db:seed — нужен справочник категорий).
 */
async function seedDemo() {
  const config = loadConfig();
  if (!config.DEMO_EMAIL) throw new Error('DEMO_EMAIL не задан — демо-аккаунт выключен');

  const db = createPrismaClient(config.DATABASE_URL);
  try {
    const categories = new Map(
      (await db.category.findMany()).map((category) => [category.key, category.id]),
    );
    const categoryId = (key: string) => {
      const id = categories.get(key);
      if (!id) throw new Error(`Нет категории «${key}» — сначала запустите pnpm db:seed`);
      return id;
    };

    const merchantIds = new Map<string, string>();
    for (const merchant of DEMO_MERCHANTS) {
      const existing = await db.merchant.findFirst({ where: { name: merchant.name } });
      const record =
        existing ??
        (await db.merchant.create({
          data: {
            name: merchant.name,
            displayName: merchant.name,
            defaultCategoryId: categoryId(merchant.categoryKey),
          },
        }));
      merchantIds.set(merchant.name, record.id);
    }

    const now = new Date();
    const user = await db.user.upsert({
      where: { email: config.DEMO_EMAIL },
      update: {},
      create: {
        email: config.DEMO_EMAIL,
        passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
      },
    });

    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await db.subscription.upsert({
      where: { userId: user.id },
      update: { status: 'trialing', currentPeriodEnd: trialEnd },
      create: { userId: user.id, status: 'trialing', currentPeriodEnd: trialEnd },
    });

    // Даты демо-покупок привязаны к «сегодня», поэтому старые чеки заменяем целиком.
    await db.receipt.deleteMany({ where: { userId: user.id } });

    const receipts = generateDemoReceipts(now);
    for (const receipt of receipts) {
      const items = [];
      for (const [position, item] of receipt.items.entries()) {
        const product = await db.product.upsert({
          where: { normalizedName: item.product.normalizedName },
          update: {},
          create: { normalizedName: item.product.normalizedName, baseName: item.product.baseName },
        });
        items.push({
          position,
          rawName: item.product.rawName,
          quantity: item.quantity,
          priceKopecks: item.sum / item.quantity,
          sumKopecks: item.sum,
          productId: product.id,
          categoryId: categoryId(item.product.categoryKey),
          categorySource: 'llm' as const,
        });
      }

      const isCash = receipt.source === 'cash';
      await db.receipt.create({
        data: {
          userId: user.id,
          merchantId: isCash ? null : (merchantIds.get(receipt.merchant) ?? null),
          note: isCash ? receipt.merchant : null,
          purchasedAt: receipt.purchasedAt,
          totalKopecks: receipt.total,
          source: receipt.source,
          items: { create: items },
        },
      });
    }

    console.log(`Демо-аккаунт ${config.DEMO_EMAIL}: ${receipts.length} чеков`);
  } finally {
    await db.$disconnect();
  }
}

await seedDemo();
