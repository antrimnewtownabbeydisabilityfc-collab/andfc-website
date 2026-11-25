// Public app shell only. Never cache private navigation or member data.
const CACHE='andfc-app-v2';
const HOME='/andfc-website/';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.add(HOME)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('andfc-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.mode!=='navigate'||u.origin!==self.location.origin)return;if(u.pathname!==HOME&&u.pathname!==HOME+'index.html')return;e.respondWith(fetch(e.request).catch(()=>caches.match(HOME)));});