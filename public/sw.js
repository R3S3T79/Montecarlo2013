// public/sw.js
// Montecarlo2013 — SW revisione 01/11/2025 v17 (auto-update + banner compatibile)

const CACHE_NAME = "montecarlo-v17";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/offline.html",
  "/icon_192x192.png",
  "/icon_512x512.png",
];

// ===============================
// 📦 INSTALL
// ===============================
self.addEventListener("install", (event) => {
  console.log("🆕 [SW] Installazione nuova versione:", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(FILES_TO_CACHE);
      console.log("✅ [SW] File precache completato:", FILES_TO_CACHE.length, "file");
    })()
  );
  // forza l’attivazione immediata
  self.skipWaiting();
});

// ===============================
// ⚡ ACTIVATE
// ===============================
self.addEventListener("activate", (event) => {
  console.log("⚡ [SW] Attivazione nuova versione:", CACHE_NAME);
  event.waitUntil(
    (async () => {
      // elimina cache obsolete
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 [SW] Rimozione cache vecchia:", key);
            return caches.delete(key);
          }
        })
      );

      // prende il controllo immediato delle pagine aperte
      await self.clients.claim();

      // notifica i client che è disponibile una nuova versione
      const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      for (const client of clientsList) {
        console.log("📢 [SW] Invio messaggio NEW_VERSION_AVAILABLE a", client.url);
        client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
      }
    })()
  );
});

// ===============================
// 🌐 FETCH
// ===============================
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignora richieste non GET
  if (request.method !== "GET") return;

  // Strategia: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => cached || caches.match("/offline.html"));
      return cached || fetchPromise;
    })
  );
});

// ===============================
// 💬 MESSAGE HANDLER
// ===============================
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      console.log("⏩ [SW] Ricevuto messaggio SKIP_WAITING → attivo subito nuovo SW");
      self.skipWaiting();
      break;

    case "CHECK_VERSION":
      console.log("🔄 [SW] Controllo versione manuale richiesto");
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "CURRENT_VERSION", version: CACHE_NAME });
        }
      });
      break;

    default:
      console.log("📩 [SW] Messaggio ricevuto:", event.data);
  }
});
