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
  console.log("old", event.request);
  event.respondWith(
    fetch(event.request).catch(function() {
      if (/\/$/.test(event.request.url))
      {
        event.request.url += "index.html";
      }
      console.log("new", event.request);
      caches.match(event.request).then(console.log);
      return caches.match(event.request);
    })
  );
});