// ===============================
// Service Worker Montecarlo2013
// Cache esteso + Prefetch API + Popup Update
// ===============================

const CACHE_NAME = "montecarlo-cache-v4"; // 🔹 incrementa a ogni deploy

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/src/index.css",
  "/Sfondo.png",
  "/vite.svg",
  "/offline.html",
  "/manifest.json",
  "/manifest.webmanifest",
];

const SUPABASE_BASE = "https://nszeiidkuzqphujyovnx.supabase.co/rest/v1";
const API_ENDPOINTS = [
  `${SUPABASE_BASE}/partite?select=*`,
  `${SUPABASE_BASE}/giocatori_stagioni?select=*`,
  `${SUPABASE_BASE}/squadre?select=*`,
  `${SUPABASE_BASE}/v_stat_giocatore_stagione?select=*`,
  `${SUPABASE_BASE}/tornei?select=*`,
  `${SUPABASE_BASE}/allenamenti?select=*`,
  `${SUPABASE_BASE}/presenze?select=*`,
];

const SUPABASE_HEADERS = {
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemVpaWRrdXpxcGh1anlvdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Njk5OTgsImV4cCI6MjA2MDU0NTk5OH0.VDvYzHjmEAAfuHTQqT5piOg4T6_HOMSFA8Q_Z7LFmfk",
  Authorization:
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemVpaWRrdXpxcGh1anlvdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Njk5OTgsImV4cCI6MjA2MDU0NTk5OH0.VDvYzHjmEAAfuHTQqT5piOg4T6_HOMSFA8Q_Z7LFmfk",
};

// Installazione
self.addEventListener("install", (event) => {
  console.log("[SW] Installazione nuova versione...");
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      for (const url of API_ENDPOINTS) {
        try {
          const res = await fetch(url, { headers: SUPABASE_HEADERS });
          if (res.ok) cache.put(url, res.clone());
        } catch (err) {
          console.warn("[SW] Prefetch fallito:", url, err);
        }
      }
    })()
  );
});

// Attivazione
self.addEventListener("activate", (event) => {
  console.log("[SW] Attivazione completata, pulizia cache vecchie...");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();

      // 🔹 Avvisa le schede aperte che è disponibile un nuovo SW
      const clientsList = await self.clients.matchAll();
      for (const client of clientsList) {
        client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
      }
    })()
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.destination === "image" || request.url.match(/\.(png|jpg|jpeg|svg|webp)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (request.url.match(/\.(css|js)$/) || request.url.includes("supabase.co")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => caches.match("/offline.html")))
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  try {
    const fresh = await fetch(request, { headers: SUPABASE_HEADERS });
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return cached || caches.match("/offline.html");
  }
}
