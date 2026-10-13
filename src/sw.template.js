// Service worker: lets the app open without internet after the first visit.
// The build fills in __VERSION__ and __FILES__ (see vite.config.ts). Plain JavaScript on purpose.
const CACHE = 'daz-alex-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Remove the caches of older versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // the page itself: the newest version if online, the saved one if not
    event.respondWith(fetch(req).catch(() => caches.match(self.registration.scope, { ignoreVary: true })));
    return;
  }
  // files with a hash in their name never change: saved copy first
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })),
  );
});
