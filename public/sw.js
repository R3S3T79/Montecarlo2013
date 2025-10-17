// ===============================
// sw Montecarlo2013
// Cache esteso + Prefetch API + Popup Update
// Data revisione: 13/10/2025 (rev: integrazione messaggi con main.tsx + gestione coerente SKIP_WAITING + avviso NEW_VERSION_AVAILABLE)
// ===============================

const CACHE_NAME = "montecarlo-cache-v8"; // 🔹 incrementa a ogni deploy

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/src/index.css",
  "/Sfondo.png",
  "/vite.svg",
  "/offline.html",
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

// ===============================
// Installazione
// ===============================
self.addEventListener("install", (event) => {
  console.log("🆕 [SW] Install nuova versione in corso...");
  self.skipWaiting(); // 🔹 forza l’attivazione immediata

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        console.log(`[SW] Cache iniziale caricata (${STATIC_ASSETS.length} file)`);

        // Prefetch API Supabase
        for (const url of API_ENDPOINTS) {
          try {
            const res = await fetch(url, { headers: SUPABASE_HEADERS });
            if (res.ok) cache.put(url, res.clone());
          } catch (err) {
            console.warn("[SW] Prefetch fallito:", url, err);
          }
        }
      } catch (err) {
        console.error("[SW] Errore durante install:", err);
      }
    })()
  );
});

// ===============================
// Attivazione
// ===============================
self.addEventListener("activate", (event) => {
  console.log("✅ [SW] Attivazione completata, pulizia cache vecchie...");

  event.waitUntil(
    (async () => {
      // Pulisce vecchie cache
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );

      await self.clients.claim();

      // 🔹 Avvisa tutte le schede che è disponibile una nuova versione
      const clientsList = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of clientsList) {
        client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
      }

      console.log("📢 [SW] Avviso NEW_VERSION_AVAILABLE inviato a tutte le schede");
    })()
  );
});

// Evita di mettere in cache le chiamate Supabase di autenticazione
if (request.url.includes("supabase.co/auth")) {
  return; // lascia passare senza cache
}


// ===============================
// Fetch handler
// ===============================
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 🔹 Immagini → cache dinamica con fallback
  if (request.destination === "image" || request.url.match(/\.(png|jpg|jpeg|svg|webp)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 🔹 JS, CSS o API Supabase
  if (request.url.match(/\.(css|js)$/) || request.url.includes("supabase.co")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 🔹 Tutto il resto
  event.respondWith(
    caches
      .match(request)
      .then((cached) => cached || fetch(request))
      .catch(() => caches.match("/offline.html"))
  );
});

// ===============================
// Strategia Stale-While-Revalidate
// ===============================
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

// ===============================
// Messaggi dal main thread
// ===============================
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    console.log("[SW] Ricevuto SKIP_WAITING → attivo subito nuovo SW");
    self.skipWaiting();
  }
});
