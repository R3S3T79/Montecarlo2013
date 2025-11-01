// public/sw.js
// Montecarlo2013 — SW revisione 31/10/2025 v16

const CACHE_NAME = `montecarlo-${Date.now()}`;
const FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icon_192x192.png',
  '/icon_512x512.png'
];

self.addEventListener('install', e => {
  console.log('🆕 [SW] Install', CACHE_NAME);
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  console.log('⚡ [SW] Activate', CACHE_NAME);
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).catch(() => caches.match('/offline.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    console.log('⏩ [SW] skipWaiting');
    self.skipWaiting();
  }
});


