import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// W trybie deweloperskim zapytania do /api i /uploads idą do serwera na porcie 4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
