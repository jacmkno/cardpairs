/*
1. Complete install after caching just index
2. Post message to app after install
*/

const CORE_FILES = ['index.html', 'package.json', 'pwa/client.js', 'favicon.ico'];

const CACHE_KEY = 'cardpairs1.1';
const BATCH_SIZE = 5;
const OS = navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows';


let installed = false;

async function loadFiles(files, client = null){
  const cFiles = [...files];
  const cache = await caches.open(CACHE_KEY);
  while(cFiles.length){
    try{
      await cache.addAll(cFiles.splice(0, BATCH_SIZE));
      if(client) {
        const progress = {loading: files.length, remaining: cFiles.length};
        console.log('FILES LOADED... ', progress)
        client.postMessage(progress);
      }
    }catch(e){
      const progress = {loading: files.length, remaining: cFiles.length, error: e};
      if(client) {
        console.log('FILES LOADING FAILED...', progress)
        client.postMessage(progress);
      }
      throw e;
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

async function checkInstalled(){
  await Promise.all([
    caches.open(CACHE_KEY).then(c => c.keys()), 
    getPackageFiles()
  ]).then(([cachedKeys, files]) => {
    // Basic cache consistency check. Just check the number of cached files.
    // TODO: Sould probably check each of the keys but this is good enough for now.
    installed = cachedKeys.length >= files.length + CORE_FILES.length;
  }).catch(e => {
    installed = false;
  });
  return installed;
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
  checkInstalled();  
});

self.addEventListener('message', (event) => {
  console.log('Event: message', event.data);
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
  console.log('Event: fetch', fetchEvent.request.url, installed);
  
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(async cached => {
      if(cached) return cached;
      if(installed && (!await checkInstalled()) && fetchEvent.clientId){
        const client = await clients.get(fetchEvent.clientId);
        if (client) {
          client.postMessage({
            reinstall: 'cache-miss',
            url: fetchEvent.request.url
          });  
        }
      }
      return fetch(fetchEvent.request);
    })
  );
});