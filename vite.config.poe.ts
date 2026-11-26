import { defineConfig, mergeConfig } from 'vite';
import { baseConfig } from './vite.config.base';
import path from 'path';
import { mockShareApi } from './shared/mockShareApi';
import { removedShareId, shareFixtures } from './poe/src/pages/share/shareFixtures';

// Only poe.re serves the share API (/api/share). The dev server answers it from a mock, so that it never
// creates shares on poe.re. SHARE_API=https://poe.re sends it to the real one instead.
const shareApi = process.env.SHARE_API;

export default mergeConfig(baseConfig, defineConfig({
  root: 'poe',
  plugins: shareApi ? [] : [mockShareApi({ game: 'poe', storagePrefix: '', fixtures: shareFixtures, removedShareId })],
  define: {
    'import.meta.env.VITE_ISSUE_TEMPLATE': JSON.stringify('bug-report.md'),
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite/poe'),
  server: {
    fs: { allow: [path.resolve(__dirname)] },
    proxy: shareApi ? { '/api': { target: shareApi, changeOrigin: true } } : undefined,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/poe'),
    emptyOutDir: true,
  },
}));
