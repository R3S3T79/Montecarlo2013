// ===============================
// Service Worker Montecarlo2013
// Cache esteso + Prefetch API
// ===============================

const CACHE_NAME = "montecarlo-cache-v3";

// Risorse statiche iniziali
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

// API Supabase principali da prefetchare
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
  apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemVpaWRrdXpxcGh1anlvdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Njk5OTgsImV4cCI6MjA2MDU0NTk5OH0.VDvYzHjmEAAfuHTQqT5piOg4T6_HOMSFA8Q_Z7LFmfk",
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemVpaWRrdXpxcGh1anlvdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Njk5OTgsImV4cCI6MjA2MDU0NTk5OH0.VDvYzHjmEAAfuHTQqT5piOg4T6_HOMSFA8Q_Z7LFmfk",
};

// Installazione: cache statici + prefetch API
self.addEventListener("install", (event) => {
  console.log("[SW] Installazione...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // cache asset statici
      await cache.addAll(STATIC_ASSETS);

      // prefetch API
      for (const url of API_ENDPOINTS) {
        try {
          const res = await fetch(url, { headers: SUPABASE_HEADERS });
          if (res.ok) {
            cache.put(url, res.clone());
          }
        } catch (err) {
          console.warn("[SW] Prefetch fallito:", url, err);
        }
      }
    })()
  );
});

// Attivazione: pulizia cache vecchie
self.addEventListener("activate", (event) => {
  console.log("[SW] Attivazione, pulizia vecchie cache...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Cache immagini
  if (request.destination === "image" || request.url.match(/\.(png|jpg|jpeg|svg|webp)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cache CSS e JS
  if (request.url.match(/\.(css|js)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cache API Supabase
  if (request.url.includes("supabase.co")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => caches.match("/offline.html")))
  );
});

// Funzione cache-first con aggiornamento in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  try {
    const fresh = await fetch(request, { headers: SUPABASE_HEADERS });
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || caches.match("/offline.html");
  }
}
