// Service worker de Facturar: permite abrir la app aunque falle la conexión.
// Cambia la versión cada vez que publiques cambios para que se descarguen.
const CACHE_NAME = 'facturar-v2';
const ARCHIVOS = [
  './',
  './index.html',
  './scripts.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

// Borra las cachés de versiones anteriores
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// Primero la red (para tener siempre la versión nueva); si no hay conexión, la caché.
// Solo se gestionan los archivos de la propia app; Firebase y Tailwind van directos.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(e.request))
  );
});
