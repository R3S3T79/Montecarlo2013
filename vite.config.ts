// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  root: ".",
  plugins: [
    react(),
    ...(process.env.NODE_ENV === "development"
      ? [] // 🔹 disabilita PWA in dev per evitare errore html-proxy
      : [
          VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            filename: "sw.js",
            includeAssets: [
              "favicon.ico",
              "apple-touch-icon.png",
              "icon_192x192.png",
              "icon_512x512.png"
            ],
            manifest: {
              name: "Montecarlo2013",
              short_name: "Montecarlo",
              start_url: "/",
              display: "standalone",
              background_color: "#ffffff",
              theme_color: "#004aad",
              icons: [
                {
                  src: "/icon_192x192.png",
                  sizes: "192x192",
                  type: "image/png"
                },
                {
                  src: "/icon_512x512.png",
                  sizes: "512x512",
                  type: "image/png"
                }
              ]
            },
            workbox: {
              clientsClaim: true,
              skipWaiting: true,
              runtimeCaching: [
                {
                  urlPattern: ({ url }) =>
                    url.origin === self.location.origin &&
                    url.pathname.endsWith(".png"),
                  handler: "CacheFirst",
                  options: {
                    cacheName: "images-cache",
                    expiration: {
                      maxEntries: 50,
                      maxAgeSeconds: 60 * 60 * 24 * 30 // 30 giorni
                    }
                  }
                },
                {
                  urlPattern: ({ url }) => url.origin === self.location.origin,
                  handler: "StaleWhileRevalidate",
                  options: {
                    cacheName: "static-resources"
                  }
                }
              ]
            }
          })
        ])
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },

  optimizeDeps: {
    include: ["bcryptjs"],
    exclude: ["lucide-react"]
  },

  server: {
    host: true,
    port: 5173,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  }
});
