// PWA: Service Worker
const CACHE_VERSION = 'v6'; // PWA
const STATIC_CACHE  = `static-${CACHE_VERSION}`; // PWA
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1) Fallback per navigazioni (refresh/URL interni) → index.html
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match('./index.html');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 2) Asset statici → cache-first con aggiornamento in background
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh.ok && request.url.startsWith(self.location.origin)) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
