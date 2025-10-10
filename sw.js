// App Shell + runtime（資料走網路優先）
const CACHE = 'announce-app-v1';
const APP_SHELL = [
  '/index.html',
  '/assets/js/config.js',
  '/assets/js/app.js',
  '/assets/js/starfield.js',
  '/assets/js/sw-register.js',
  '/assets/manifest.webmanifest',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // 僅快取同源的 App Shell
  if (url.origin === location.origin && APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
    return;
  }
  // 資料與其他資源：網路優先，失敗再回快取
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
