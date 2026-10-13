import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node22',
  clean: true,
  // Общий пакет хранится в исходниках на TS, поэтому вшиваем его в сборку.
  noExternal: [/^@how-much\//],
});
