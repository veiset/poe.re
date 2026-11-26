import { defineConfig, mergeConfig } from 'vite';
import { baseConfig } from './vite.config.base';
import path from 'path';

export default mergeConfig(baseConfig, defineConfig({
  root: 'poe',
  define: {
    'import.meta.env.VITE_ISSUE_TEMPLATE': JSON.stringify('bug-report.md'),
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite/poe'),
  server: {
    fs: { allow: [path.resolve(__dirname)] },
    // The share page fetches /api/share/<id>, which only poe.re serves
    proxy: { '/api': { target: 'https://poe.re', changeOrigin: true } },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/poe'),
    emptyOutDir: true,
  },
}));
