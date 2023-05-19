/*
1. Complete install after caching just index
2. Post message to app after install
*/

const CORE_FILES = ['./', 'index.html', 'package.json', 'pwa/client.js', 'favicon.ico'];

const CACHE_KEY = 'cardpairs';
const VERSION = '2.1';
const MAX_CONCURRENT_FETCHES = 80;
const MAX_RETRIES = 2;
const PROGRESS_FREQ_MS = 1000;
const REQUEST_TIMEOUT_MS = 3000;
const OS = navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows';



async function getCacheValue(key) {
  const cache = await caches.open(CACHE_KEY);
  const response = await cache.match(key);
  if (response) {
    const data = await response.text();
    return data;
  }
  return null;
}

// Set the value in cache
async function setCacheValue(key, value) {
  const cache = await caches.open(CACHE_KEY);
  const response = new Response(value);
  await cache.put(key, response);
}

async function setInstalled(){
  await setCacheValue('_installed_version', VERSION);
}

async function getInstalled(){
  return getCacheValue('_installed_version').then(v => v == VERSION)
}

function cacheUrl(url, cache, attempts = 0){
  const timestamp = new Date().getTime();
  let fUrl = url;
  if(fUrl.indexOf('?') >= 0) fUrl += '&timestamp=' + timestamp;
  else fUrl += '?timestamp=' + timestamp;

  return Promise.race([
    fetch(fUrl), 
    new Promise(r => setTimeout(r, REQUEST_TIMEOUT_MS))
  ]).then(response => {
    if (!(response || {}).ok){
      if(attempts >= MAX_RETRIES){
        throw Error("Response not ok");
      }else{
        return cacheUrl(url, cache, attempts + 1);
      }
    }
    if (response.status === 200) {
      return cache.put(url, response);
    }
    return null;
  });
}

async function loadFiles(files, client = null){
  const cFiles = files.map(f => f);
  const cache = await caches.open(CACHE_KEY);
  const pending = {};
  let cnt = 0;
  let t0 = 0;

  function notifyProgress(){
    if(client) {
      const progress = {loading: files.length, remaining: cFiles.length, pending: Object.keys(pending).length, timestamp: new Date().getTime()};
      console.log('LOADING PROGRESS:', progress)
      return client.postMessage(progress);
    }
  }

  return new Promise(async (done, fail)=>{
    let failed = false;
    while(cFiles.length){
      let bufferSize = Object.keys(pending).length;
      if(bufferSize < MAX_CONCURRENT_FETCHES){
        ((id)=>{
          const next = cFiles.shift();
          pending[id] = cacheUrl(next, cache)
            .then(() => delete pending[id])
            .catch(e => {
              failed = true;
              fail(e);
            });
        })(cnt);
        cnt ++; bufferSize ++;
      }
      if(bufferSize >= MAX_CONCURRENT_FETCHES){
        await new Promise(r => setTimeout(r, 300));
      }
      if(failed) return;
      if(new Date().getTime() - t0 > PROGRESS_FREQ_MS){
        await notifyProgress();
        t0 = new Date().getTime();
      }
    }
    await Promise.all(Object.values(pending));
    await notifyProgress();

    done();
  }).catch(async e => {
    const progress = { loading: files.length, remaining: cFiles.length, error: e, pending: Object.keys(pending).length };
    if(client) {
      console.log('FILES LOADING FAILED...', progress)
      await client.postMessage(progress);
    }
    throw e;
  });
}

async function criticalCacheGet(url, event = null){
  let cached = await caches.open(CACHE_KEY).then(c => c.match(url));
  if(!cached) {
    await loadFiles([url]);
    cached = await caches.open(CACHE_KEY).then(c => c.match(url));
  }

  caches.delete(CACHE_KEY)
    .then( () => loadFiles(CORE_FILES))
    .then( () => event ? event.source.postMessage({uninstalled: true}): null );

  return cached.json();
}

async function getPackageFiles(event){
  const package = await criticalCacheGet('package.json', event);
  const files = [];
  for(let k in package){
    if(k == 'timestamp') continue;
    if(!k.startsWith('OS')){
      files.push(...package[k].map(v=>k + '/' + v))
    }else if(k == `OS.${OS}`){
      files.push(...package[k])
    }
  }
  return {files, timestamp: package.timestamp || 1};
}

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
  console.log('Event: install', self);
  e.waitUntil(Promise.all([
    self.skipWaiting(),  loadFiles(CORE_FILES)
  ]));
});

self.addEventListener('activate', event => {
  console.log('Event: activate');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', async (event) => {
  console.log('Event: message', event.data);
  if(!event.data) return;
  if(event.data.cmd === 'LOAD_ASSETS') {
    getPackageFiles(event).then(async ({files, timestamp}) => {
      return loadFiles(files, event.source).then(async () => {
          await setInstalled();
          event.source.postMessage({isInstalled: await getInstalled()});
      });
    }).catch(e => {
      console.log('Faild to get Package Files:', e);
      const progress = { loading: 1, remaining: 1, error: e, pending: 0 };
      event.source.postMessage(progress);
    });
  }
  if(event.data.cmd === 'GET_STATUS') {
    event.source.postMessage({isInstalled: await getInstalled()})
  }
  if(event.data.cmd === 'UNINSTALL'){
    caches.delete(CACHE_KEY)
      .then( () => loadFiles(CORE_FILES))
      .then( () => event.source.postMessage({uninstalled: true}) )
  }
  if(event.data.cmd === 'GET_VERSION') {
    event.source.postMessage({version: VERSION});
  }

});

self.addEventListener('fetch', function(fetchEvent) {
  fetchEvent.respondWith((async ()=>{
    console.log('Event: fetch', fetchEvent.request.url);
    const client = fetchEvent.clientId ? await clients.get(fetchEvent.clientId) : null;  
    const cache = await caches.open(CACHE_KEY);
    const cached = await cache.match(fetchEvent.request);
  
    if (client) client.postMessage({
      message:  '(CACHE ' + ((cached ? `HIT` : 'MISS') + `) ${fetchEvent.request.url}`),
    });

    return cached || fetch(fetchEvent.request.url);
  })());
});