import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В разработке фронтенд и API на разных портах; прокси убирает CORS из картины.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
