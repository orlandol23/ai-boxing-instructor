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
        // include the self-hosted fonts (woff2) in the precache, for offline
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // /api/* are Vercel Functions: the SW must not answer with the app shell
        navigateFallbackDenylist: [/^\/api\//],
        // MediaPipe (WASM runtime + pose model, ~10MB) comes from a CDN
        // and stays out of the precache. Without these routes, "training
        // with no network" only holds while the browser HTTP cache lasts.
        // CacheFirst because they are versioned, immutable artifacts, so
        // the cache beats the network. Cross-origin responses are opaque
        // (status 0), which is why cacheableResponse accepts 0 next to 200.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
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
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
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
