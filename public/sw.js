/**
 * A-GENTEE Service Worker v2.0 — Phase 3
 * Combines: PWA cache (v1.1) + Push notifications (Phase 3)
 */

const CACHE = 'agentee-v2.0';
const ASSETS = ['/', '/index.html'];

// ═══ PWA CACHING (preserved from v1.1) ═══

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

// ═══ PUSH NOTIFICATIONS (Phase 3) ═══

const DEFAULT_ICON = '/kahotia/icon-192.svg';
const DEFAULT_URL = '/';

self.addEventListener('push', (event) => {
  let data = {
    title: 'A-GENTEE',
    body: 'الموجة وصلت 🌊',
    icon: DEFAULT_ICON,
    url: DEFAULT_URL,
    tag: 'agentee-notification',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: data.tag || 'agentee-notification',
    data: { url: data.url || DEFAULT_URL },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || DEFAULT_URL;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
