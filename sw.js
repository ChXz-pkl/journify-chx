// sw.js
const CACHE_NAME = 'journify-v4';

const urlsToCache = [
    // File Inti Aplikasi
    './',
    './index.html',
    './auth.html',
    './dashboard.html',
    './style.css',
    './offline.html',
    './main.js',
    './auth.js',
    './onboarding.js',
    // Pastikan Dexie.mjs berada di direktori root
    './dexie.mjs', // Gunakan jalur absolut yang benar
    './manifest.json',
    './icon-192.png',
    './icon-512.png',

    // Library Day.js & Plugin-nya
    'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
    'https://cdn.jsdelivr.net/npm/dayjs@1/plugin/isSameOrAfter.js',
    'https://cdn.jsdelivr.net/npm/dayjs@1/plugin/weekOfYear.js',
    'https://cdn.jsdelivr.net/npm/dayjs@1/plugin/isSameOrBefore.js', // Tambahkan plugin yang hilang

    // Library Lainnya
    'https://cdn.jsdelivr.net/npm/sweetalert2@11',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js',

    // Library Onboarding (Shepherd.js)
    'https://cdn.jsdelivr.net/npm/shepherd.js@10.0.1/dist/js/shepherd.min.js',
    'https://cdn.jsdelivr.net/npm/shepherd.js@10.0.1/dist/css/shepherd.css',

    // Library EmailJS
    'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',

    // Library Font
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',

    // Library TinyMCE (Editor Teks)
    'https://cdn.tiny.cloud/1/tmkn3fjkqruhxrxzucgpa2cmmd33kveh6xqfta2nqc1aopvv/tinymce/6/tinymce.min.js',
    'https://cdn.tiny.cloud/1/tmkn3fjkqruhxrxzucgpa2cmmd33kveh6xqfta2nqc1aopvv/tinymce/6/skins/ui/oxide/skin.min.css',
    'https://cdn.tiny.cloud/1/tmkn3fjkqruhxrxzucgpa2cmmd33kveh6xqfta2nqc1aopvv/tinymce/6/skins/ui/oxide/content.min.css',
    'https://cdn.tiny.cloud/1/tmkn3fjkqruhxrxzucgpa2cmmd33kveh6xqfta2nqc1aopvv/tinymce/6/skins/content/default/content.min.css'
];

// Event listener 'install' dan 'fetch' tetap sama
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting(); // langsung activate setelah install
});
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Kalau ada di cache → balikin dari cache
        return caches.match(event.request).then(response => {
          if (response) return response;
          // Kalau gak ada → fallback ke offline.html (khusus navigasi HTML)
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim(); // langsung ambil kontrol page aktif
});
