import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export const baseConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@poe': path.resolve(__dirname, 'poe/src'),
      '@poe2': path.resolve(__dirname, 'poe2/src'),
    },
  },
  server: {
    port: 3000,
  },
});
