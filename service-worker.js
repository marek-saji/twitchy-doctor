self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('complete').then(cache =>
      cache.addAll([
        '/style.css',
        '/script.js',
        '/',
        '/data/wikipedia-serials.html',
      ])
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('complete').then(cache =>
      fetch(event.request)
        .then(response => {
          cache.put(event.request, response.clone());
          return response || caches.match(event.request);
        })
        .catch(() => caches.match(event.request))
    )
  );
});