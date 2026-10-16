// AND FC app shell: network-first navigation, offline fallback.
const CACHE = 'andfc-app-v1';
const HOME = '/andfc-website/';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([HOME, HOME + 'manifest.webmanifest', HOME + 'assets/icons/andfc-192.png', HOME + 'assets/icons/andfc-512.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(HOME, copy));
    }
    return response;
  }).catch(() => caches.match(HOME)));
});
