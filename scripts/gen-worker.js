const fs = require('fs');

const srcs = {
    fonts: fs.readdirSync("./fonts"),
    cards: fs.readdirSync("./cards"),
    audios: fs.readdirSync("./audios")
};

fs.writeFileSync( 'service-worker.js', `
const srcs = ${JSON.stringify(srcs, null, 2)};
var filesToCache = ['cards.js', 'cards.css'];
Object.entries(srcs).forEach((dir, files)=>
    filesToCache.push(...files.map(f => dir + '/' + f))
);

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
e.waitUntil(
    caches.open('card-game').then(function(cache) {
    return cache.addAll(filesToCache);
    })
);
self.skipWaiting();
});

/* Serve cached content when offline */
self.addEventListener('fetch', function(e) {
e.respondWith(
    caches.match(e.request).then(function(response) {
    return response || fetch(e.request);
    })
);
});
`.trim());