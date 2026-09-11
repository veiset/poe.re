import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// A Pages deployment is immutable, so incorporate its commit SHA into every
// generated asset URL. This prevents a browser or CDN from reusing a cached
// response for an asset from a previous deployment.
const deploymentId = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12);
const assetSuffix = deploymentId ? `-${deploymentId}` : '';

export const baseConfig = defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]${assetSuffix}.js`,
        chunkFileNames: `assets/[name]-[hash]${assetSuffix}.js`,
        assetFileNames: `assets/[name]-[hash]${assetSuffix}[extname]`,
      },
    },
  },
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
