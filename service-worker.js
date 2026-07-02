const CACHE_NAME = "meu-app-cache-v3";
const urlsToCache = [
  "index.html",
  "favicon.ico",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "src/css/styles.css",
  "src/js/script.js",
  "src/js/html2canvas.min.js",
  "src/js/jspdf.umd.min.js",
  "src/js/pdfobject.min.js",
  "src/data/clientes.json"
];


self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
