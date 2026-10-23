// Простой Service Worker: кэширует всё при установке,
// отдаёт из кэша, обновляет кэш в фоне (stale-while-revalidate).
// При изменении файлов — поднимите версию CACHE_NAME.

const CACHE_NAME = "food-diary-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./src/styles.css",
  "./src/app.js",
  "./src/storage.js",
  "./src/calendar.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
