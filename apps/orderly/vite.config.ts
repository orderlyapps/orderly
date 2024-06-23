import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';
import htmlPlugin from 'vite-plugin-html-config';

const APP_NAME = 'Orderly';

const htmlPluginOpt = {
  title: APP_NAME,
  metas: [
    {
      name: 'theme-color',
      media: '(prefers-color-scheme: light)',
      content: '#f7f7f7',
    },
    {
      name: 'theme-color',
      media: '(prefers-color-scheme: dark)',
      content: '#0d0d0d',
    },
    {
      name: 'apple-mobile-web-app-title',
      media: '-',
      content: APP_NAME,
    },
  ],
};

const vitePWAOpt: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  manifest: {
    short_name: APP_NAME,
    name: APP_NAME,
    icons: [
      {
        src: 'assets/manifest-icon-192.maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'assets/manifest-icon-192.maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'assets/manifest-icon-512.maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'assets/manifest-icon-512.maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    start_url: '.',
    display: 'standalone',
    theme_color: '#ffffff',
    background_color: '#ffffff',
  },
};

export default defineConfig({
  define: { BUILD_TIME: new Date() },
  plugins: [
    htmlPlugin(htmlPluginOpt),
    react(),
    VitePWA(vitePWAOpt),
  ],
  build: {
    outDir: '../../dist/apps/orderly',
  },
});
