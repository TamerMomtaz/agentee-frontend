// A-GENTEE Service Worker v1.0
const CACHE_NAME = 'agentee-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell');
      return cache.addAll(SHELL_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // API calls: network only (don't cache backend responses)
  if (url.hostname === 'agentee.up.railway.app') return;

  // Chrome extensions, etc
  if (!url.protocol.startsWith('http')) return;

  // App assets: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: return cached or offline page
          return cached || new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>A-GENTEE</title></head>' +
            '<body style="background:#0a0a0f;color:#4FC3F7;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;text-align:center">' +
            '<div><h2>A-GENTEE</h2><p style="color:#999;font-size:0.8rem">Offline · Waiting for connection...</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });

      return cached || fetchPromise;
    })
  );
});
