import { defineConfig } from 'prisma/config';

// Один .env на весь монорепозиторий — в корне. Node 22 читает его сам, без пакета dotenv.
try {
  process.loadEnvFile('../../.env');
} catch {
  // В CI и на сервере переменные приходят из окружения, файла может не быть.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
