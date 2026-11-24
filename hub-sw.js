// Network only: never store member or financial data in an offline cache.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'&&new URL(e.request.url).pathname.endsWith('/club-hub.html'))e.respondWith(fetch(e.request).catch(()=>new Response('<h1>AND FC Club Hub</h1><p>Internet connection required. Reconnect and reopen the app.</p>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));});