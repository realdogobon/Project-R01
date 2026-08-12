// RoyScript TSR service worker
// Strategy: network-first for navigation requests (index.html / entry JS),
// cache-first for everything else. The cache name is bumped on every
// deployment that changes the entry bundle, so an activated update
// deletes the stale shell (which references old hashed JS filenames).
const CACHE_NAME = "royscript-tsr-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests and skip browser extensions/api calls
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Navigation requests (index.html and hashed entry JS): network-first.
  // This guarantees a returning user always receives the fresh shell that
  // points at the newly deployed bundle instead of a stale cached HTML.
  const isNavigation = event.request.mode === "navigate";
  const isEntryJs = /\/assets\/index-.*\.js$/.test(new URL(event.request.url).pathname);

  if (isNavigation || isEntryJs) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve the cached shell if one exists
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response("Offline Mode active. Assets are cached locally.");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for offline if not loaded
        return new Response("Offline Mode active. Assets are cached locally.");
      });
    })
  );
});
