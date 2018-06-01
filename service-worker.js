self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('complete').then(function(cache) {
      return cache.addAll([
        '/style.css',
        '/script.js',
        '/index.html',
        '/data/wikipedia-serials.html',
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});