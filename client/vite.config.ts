import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Gia Phả - Kết nối gia đình',
        short_name: 'Gia Phả',
        description: 'Mạng xã hội gia phả: cây gia đình, bảng tin, nhắn tin & gọi video.',
        lang: 'vi',
        theme_color: '#f59e0b',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // API and uploads are dynamic/auth'd — never serve them from the SW cache.
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/socket\.io/],
        runtimeCaching: [
          {
            urlPattern: /\/uploads\/.*\.(?:png|jpg|jpeg|gif|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5101,
    proxy: {
      '/api': { target: 'http://localhost:5109', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5109', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5109', changeOrigin: true, ws: true },
    },
  },
});
