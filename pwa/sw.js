/*
1. Complete install after caching just index
2. Post message to app after install
*/

const CORE_FILES = ['index.html', 'package.json', 'pwa/client.js'];

const CACHE_KEY = 'cardpairs1.0';
const BATCH_SIZE = 5;
const OS = navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows';


let installed = false;

async function loadFiles(files, client = null){
  const cFiles = [...files];
  const cache = await caches.open(CACHE_KEY);
  while(cFiles.length){
    await cache.addAll(cFiles.splice(0, BATCH_SIZE));
    if(client) {
      client.postMessage({loading: files.length, remaining: cFiles.length});
    }
  }
}

async function getPackageFiles(){
  const package = await caches.match('package.json')
    .then(r => r.json());
  const files = [];
  for(let k in package){
    if(!k.startsWith('OS')){
      files.push(...package[k].map(v=>k + '/' + v))
    }else if(k == `OS.${OS}`){
      files.push(...package[k])
    }
  }
  return files;
}

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
  console.log('Event: install');
  e.waitUntil(Promise.all([
    self.skipWaiting(),  loadFiles(CORE_FILES)
  ]));
});

self.addEventListener('activate', event => {
  console.log('Event: activate');
  event.waitUntil(clients.claim());

  Promise.all([
    caches.open(CACHE_KEY).then(c => c.keys()), 
    getPackageFiles()
  ]).then(([cachedKeys, files]) => {
    // Basic cache consistency check. Just check the number of cached files.
    // TODO: Sould probably check each of the keys but this is good enough for now.
    installed = cachedKeys.length >= files.length + CORE_FILES.length;
  }).catch(e => {
    installed = false;
  });
  
});

self.addEventListener('message', (event) => {
  console.log('Event: message', event);
  if(!event.data) return;
  if(event.data.cmd === 'LOAD_ASSETS') {
    getPackageFiles().then(async files => {
      return loadFiles(files, event.source).then(
        () => installed = true
      );
    });
  }
  if(event.data.cmd === 'GET_STATUS') {
    event.source.postMessage({isInstalled: installed})
  }
});

self.addEventListener('fetch', function(fetchEvent) {
  console.log('Event: fetch', fetchEvent.request.url);

  fetchEvent.respondWith(installed
    ? caches.match(e.request).catch(async e => {
      if (!fetchEvent.clientId) return;

      const client = await clients.get(fetchEvent.clientId);
      if (!client) return;
      installed = false;
      client.postMessage({
        reinstall: 'cache-miss',
        url: fetchEvent.request.url
      });
    })
    : fetch(e.request));
});