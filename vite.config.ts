import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || env.GITHUB_ACTIONS === 'true';
  const appBase = isGithubPages ? '/PasseFIT/' : '/';

  return {
    base: appBase,
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-180x180.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-512x512.svg'],
        manifest: {
          name: 'PasseFIT',
          short_name: 'PasseFIT',
          description: 'La tua app per l\'allenamento',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          start_url: appBase,
          scope: appBase,
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
