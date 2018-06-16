// Bootstrap cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('complete').then(cache => {
      return cache.addAll([
        '/style.css',
        '/script.js',
        '/',
        '/data/wikipedia-serials.html',
      ])
    })
  );
});

// Try network, fallback to cache
// Cache every request
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('complete').then(cache => {
      return fetch(event.request)
        .then(response => {
          if (event.request.url.match(/^https:/)) {
            cache.put(event.request, response.clone());
          }
          return response || caches.match(event.request);
        })
        .catch(() => caches.match(event.request))
    })
  );
});
