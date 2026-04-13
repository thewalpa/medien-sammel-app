import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg'],
      manifest: {
        name: 'Medien Sammel App',
        short_name: 'MedienSammelApp',
        description: 'Visually map out how you connect different pieces of media',
        theme_color: '#1a1520',
        background_color: '#1a1520',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        categories: ['entertainment', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-maskable-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'openlibrary-covers', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/coverartarchive\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'musicbrainz-covers', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'tmdb-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/images\.metmuseum\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'metmuseum-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
})
