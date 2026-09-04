import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      workbox: {
        // inclui as fontes self-hosted (woff2) no precache p/ offline
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // /api/* são Vercel Functions — o SW não deve responder com o app shell
        navigateFallbackDenylist: [/^\/api\//],
        // O MediaPipe (runtime WASM + modelo de pose, ~10MB) vem de CDN e
        // não entra no precache. Sem estas rotas, "treinar sem rede" só
        // vale enquanto o cache HTTP do browser durar. CacheFirst: são
        // artefatos versionados/imutáveis, então cache vence rede.
        // Respostas cross-origin são opacas (status 0) — daí o
        // cacheableResponse aceitar 0 junto com 200.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'AI Boxing Instructor',
        short_name: 'BoxingAI',
        description: 'Virtual boxing instructor with real-time pose analysis',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-192.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
