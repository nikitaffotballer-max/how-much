import { defineConfig } from 'vitest/config';

// Тестам нужна база: локально берём DATABASE_URL из корневого .env, в CI — из окружения.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Файла нет — значит, переменные уже заданы снаружи.
}

export default defineConfig({
  test: {
    // Тесты пишут в одну базу; последовательный запуск проще отлаживать.
    fileParallelism: false,
  },
});
