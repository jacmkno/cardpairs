window.addEventListener('load', function(){
  if ('serviceWorker' in navigator) {
    console.log('Service Worker Compatibility Found...');
    document.body.classList.add('pwa');

    function setInstalled(installed){
      window.PWAinstalled = data.isInstalled;
      document.body.setAttribute('pwaInstalled', installed ? 1 : 0);
      console.log('PWA.setInstalled:', installed);
    }

    navigator.serviceWorker.ready.then((registration) => {
      return (new Promise((done, fail) => {
        const t0 = new Date().getTime();
        const i = setInterval(()=> {
          if(navigator.serviceWorker.controller){
            clearInterval(i);
            done();
          }
          if(new Date().getTime() - t0 > 5000){
            fail();
          }
        }, 100);
      }))
    }).then(() => {
      return new Promise(r => {
        window.onPWAMessage = function(data){
          if(data.isInstalled !== undefined){
            setInstalled(data.isInstalled);
            r(data.isInstalled);
          }
        }

        navigator.serviceWorker.controller.postMessage({
          cmd: 'GET_STATUS',
        });
      });
    }).then(() => {
      console.log('Service Worker Is Available');
      document.body.classList.add('pwa-available');

      window.installPWA = function(){  
        return new Promise((done, fail) => {
          window.onPWAMessage = function(data){
            if(data.loading !== undefined){
              if(!data.remaining){
                done();
              } else {
                const progress = data.loading 
                  ? (data.loading - data.remaining) / data.loading
                  : 1;
                document.body.style.setProperty(
                  '--pwa-install-progress', progress
                );
                console.log('PWA Install Progress: ', Math.floor(100 * progress) + '%')
              }
            }
          }
          navigator.serviceWorker.controller.postMessage({
            cmd: 'LOAD_ASSETS',
          });    
        }).then(e => setInstalled(true));
      }
    }).catch(e=>{
      console.log('ERROR:', e);
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if(event.data.reinstall){
        setInstalled(false);
      }
      if(window.onPWAMessage){
        window.onPWAMessage(event.data);
      }
    });

    navigator.serviceWorker
      .register('./pwa/sw.js')
      .then(function() { console.log('Service Worker Registered'); });
  }
});