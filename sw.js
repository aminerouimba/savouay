// sw.js
const CACHE_NAME = 'spa-qs-cache-v2';
const APP_SHELL = [
  './QS.htm',
  './manifest.json',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (err) {
          // Never block SW install for one failed asset.
          console.warn('Cache add failed:', url, err);
        }
      }
    })
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  const isHtmlNavigation = req.mode === 'navigate' || req.destination === 'document';
  const isCdnAsset = /cdnjs\.cloudflare\.com$/i.test(new URL(req.url).hostname);

  if (isSameOrigin && isHtmlNavigation) {
    // Always prefer fresh HTML so app updates are visible immediately.
    event.respondWith(
      fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return networkRes;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (isCdnAsset) {
    event.respondWith(
      fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return networkRes;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req)
      .then(response => response || fetch(req))
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      }),
      self.clients.claim()
    ])
  );
});
