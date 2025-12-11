const CACHE_NAME = 'pit-calc-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Skip non-GET requests (POST, etc.)
  if (e.request.method !== 'GET') return;
  
  // Skip external requests (analytics, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;
  
  // Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});