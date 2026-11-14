const CACHE_NAME = 'voxelworld-pwa-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Solo interceptar documentos de navegación para no servir HTML en lugar de scripts JS/CSS en Vercel
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((res) => res || caches.match('/'));
    })
  );
});
