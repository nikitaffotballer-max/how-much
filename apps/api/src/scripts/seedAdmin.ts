import { createPrismaClient } from '@how-much/db';
import { hashPassword } from '../auth/password.js';
import { loadConfig } from '../config.js';

/**
 * Локальный тестовый пользователь admin / admin — чтобы проверять сервис на своей почте,
 * не регистрируясь каждый раз. Повторный запуск сбрасывает пароль и продлевает пробный Pro.
 * Запуск: pnpm db:seed:admin. На продакшене не запускается: такой пароль подбирается сразу.
 */
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin';
const TRIAL_DAYS = 14;

async function seedAdmin() {
  const config = loadConfig();
  if (config.NODE_ENV === 'production') {
    throw new Error('Пользователь admin/admin только для локальной разработки');
  }

  const db = createPrismaClient(config.DATABASE_URL);
  try {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const subscription = {
      status: 'trialing' as const,
      currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    };

    await db.user.upsert({
      where: { email: ADMIN_LOGIN },
      update: {
        passwordHash,
        subscription: { upsert: { create: subscription, update: subscription } },
      },
      create: { email: ADMIN_LOGIN, passwordHash, subscription: { create: subscription } },
    });
    console.log(`Тестовый пользователь готов: ${ADMIN_LOGIN} / ${ADMIN_PASSWORD}`);
  } finally {
    await db.$disconnect();
  }
}

await seedAdmin();
