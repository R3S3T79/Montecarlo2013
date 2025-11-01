// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // mostra popup quando c'è update
      filename: `sw-${Date.now()}.js`, // 👈 cambia nome a ogni build
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icon_192x192.png',
        'icon_512x512.png'
      ],
      manifest: {
        name: 'Montecarlo2013',
        short_name: 'Montecarlo',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#004aad',
        icons: [
          { src: '/icon_192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon_512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
