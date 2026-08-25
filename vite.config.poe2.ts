import { defineConfig, mergeConfig } from 'vite';
import { baseConfig } from './vite.config.base';
import path from 'path';

export default mergeConfig(baseConfig, defineConfig({
  root: 'poe2',
  define: {
    'import.meta.env.VITE_ISSUE_TEMPLATE': JSON.stringify('bug-report-poe2.md'),
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite/poe2'),
  server: {
    fs: { allow: [path.resolve(__dirname)] },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/poe2'),
    emptyOutDir: true,
  },
}));
