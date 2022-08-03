/*
1. Complete install after caching just index
2. Post message to app after install
*/

const CORE_FILES = ['./', 'index.html', 'package.json', 'pwa/client.js', 'favicon.ico'];

const CACHE_KEY = 'cardpairs1.9';
const MAX_CONCURRENT_FETCHES = 80;
const MAX_RETRIES = 2;
const PROGRESS_FREQ_MS = 1000;
const REQUEST_TIMEOUT_MS = 3000;
const OS = navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows';


let installed = false;

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
    return cache.put(url, response);
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

async function getPackageFiles(){
  const package = await caches.open(CACHE_KEY).then(c => c.match('package.json'))
    .then(r => r.json());
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

async function checkInstalled(){
  await Promise.all([
    caches.open(CACHE_KEY).then(c => c.keys()), 
    getPackageFiles()
  ]).then(([cachedKeys, {files, timestamp}]) => {
    // Basic cache consistency check. Just check the number of cached files.
    // TODO: Sould probably check each of the keys but this is good enough for now.
    installed = (cachedKeys.length >= files.length + CORE_FILES.length) ? timestamp : false;
  }).catch(e => {
    installed = false;
  });
  return installed;
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
  checkInstalled();  
});

self.addEventListener('message', (event) => {
  console.log('Event: message', event.data);
  if(!event.data) return;
  if(event.data.cmd === 'LOAD_ASSETS') {
    getPackageFiles().then(async ({files, timestamp}) => {
      return loadFiles(files, event.source).then(
        () => {
          installed = timestamp;
          event.source.postMessage({isInstalled: installed});
        }
      );
    }).catch(e => {
      console.log('Faild to get Package Files:', e);
      const progress = { loading: 1, remaining: 1, error: e, pending: 0 };
      event.source.postMessage(progress);
    });
  }
  if(event.data.cmd === 'GET_STATUS') {
    event.source.postMessage({isInstalled: installed})
  }
  if(event.data.cmd === 'UNINSTALL'){
    caches.delete(CACHE_KEY)
      .then( () => loadFiles(CORE_FILES))
      .then( () => event.source.postMessage({uninstalled: true}) )
  }
});

self.addEventListener('fetch', function(fetchEvent) {
  console.log('Event: fetch', fetchEvent.request.url, installed);
  
  fetchEvent.respondWith(
    caches.open(CACHE_KEY).then(c => c.match(fetchEvent.request)).then(async cached => {
      if(cached) {
        console.log('CACHE.HIT:', fetchEvent.request.url);
        return cached;
      }
      if(installed && (!await checkInstalled()) && fetchEvent.clientId){
        const client = await clients.get(fetchEvent.clientId);
        if (client) {
          client.postMessage({
            reinstall: 'cache-miss',
            url: fetchEvent.request.url
          });  
        }
      }
      return fetch(fetchEvent.request).catch(e => new Response('<h1>Service Unavailable</h1>', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/html'
        })
      }));
    })
  );
});