/*
1. Complete install after caching just index
2. Post message to app after install
*/

const CACHE_KEY = 'cardpairs1.0';
const BATCH_SIZE = 5;
const OS = navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows';
async function loadFiles(files, client = null){
  const cFiles = [...files];
  const cache = await caches.open(CACHE_KEY);
  console.log('CACHE_OPENED:', cFiles.length, cache);
  while(cFiles.length){
    const batch = cFiles.splice(0, BATCH_SIZE);
    console.log('CACHE_ADDING:', batch);
    await cache.addAll(batch);
    console.log('PREPOST:', client);
    if(client) {
      client.postMessage({loading: files.length, remaining: cFiles.length});
      console.log('POSTED:', client);
    }
  }
}

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
  console.log('Event: install');
  e.waitUntil(Promise.all([
    self.skipWaiting(), 
    loadFiles(['index.html', 'package.json'])
  ]));
});

self.addEventListener('activate', event => {
  console.log('Event: activate');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('Event: message', event);
  if(!event.data) return;
  if(event.data.cmd === 'LOAD_ASSETS') {
    console.log('Event: message.LOAD_ASSETS');
    caches.match('package.json').then(r=>r.json())
    .then(async package => {
      const files = [];
      for(let k in package){
        if(!k.startsWith('OS')){
          files.push(...package[k].map(v=>k + '/' + v))
        }else if(k == `OS.${OS}`){
          files.push(...package[k])
        }
      }
      console.log('Load Package:', files);
      return loadFiles(files, event.source);
    });
  }
});

self.addEventListener('fetch', function(e) {
  console.log('Event: Fetch', e.request.url);
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});