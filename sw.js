/* =====================================================================
   SERVICE WORKER — SOBAT BK
   Tujuan utama: syarat teknis agar situs bisa "Diinstal" sebagai aplikasi
   di laptop (Chrome/Edge) maupun HP Android. Untuk iPhone, instalasi
   dilakukan lewat menu Share -> "Add to Home Screen" di Safari (lihat
   meta tag apple-mobile-web-app-* di index.html/admin.html).

   Strategi: cache-first hanya untuk "app shell" (file tampilan statis).
   Data dari Supabase (laporan, konsultasi, dll) SELALU diambil langsung
   dari internet (tidak di-cache), supaya data yang tampil selalu yang
   terbaru dan tidak ada data sensitif yang tersimpan di cache HP.
   ===================================================================== */

const CACHE_NAME = 'sobatbk-shell-v2';

const APP_SHELL = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './admin.html',
  './admin.css',
  './admin.js',
  './manifest.json',
  './admin-manifest.json',
  './logosobatbk.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani permintaan GET ke domain sendiri (app shell).
  // Permintaan ke Supabase/API lain dibiarkan lewat langsung ke internet.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      // Tampilkan versi cache dulu (kalau ada) biar cepat, sambil tetap
      // memperbarui cache di latar belakang dari jaringan.
      return cached || network;
    })
  );
});
