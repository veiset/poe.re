import { defineConfig, mergeConfig } from 'vite';
import { baseConfig } from './vite.config.base';
import path from 'path';
import { mockShareApi } from './shared/mockShareApi';
import { removedShareId, shareFixtures } from './poe2/src/pages/share/shareFixtures';

// Only poe2.re serves its share API (/api/share). The dev server answers it from a mock, so that it never
// creates shares on poe2.re. SHARE_API=https://poe2.re sends it to the real one instead.
const shareApi = process.env.SHARE_API;

export default mergeConfig(baseConfig, defineConfig({
  root: 'poe2',
  plugins: shareApi ? [] : [mockShareApi({ game: 'poe2', storagePrefix: 'poe2.', fixtures: shareFixtures, removedShareId })],
  define: {
    'import.meta.env.VITE_ISSUE_TEMPLATE': JSON.stringify('bug-report-poe2.md'),
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite/poe2'),
  server: {
    fs: { allow: [path.resolve(__dirname)] },
    proxy: shareApi ? { '/api': { target: shareApi, changeOrigin: true } } : undefined,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/poe2'),
    emptyOutDir: true,
  },
}));
