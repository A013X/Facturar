const CACHE_NAME = 'mi-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js'
];

// Instalar
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Responder desde cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});