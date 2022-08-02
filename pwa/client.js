window.addEventListener('load', function(){
  if ('serviceWorker' in navigator) {
    console.log('Service Worker Compatibility Found...');
    document.body.classList.add('pwa');

    function setInstalled(installed){
      window.PWAinstalled = installed;
      document.body.setAttribute('pwaInstalled', installed ? 1 : 0);
      console.log('PWA.setInstalled:', installed);
      document.body.style.removeProperty('--pwa-install-progress');
      document.body.style.removeProperty('--pwa-install-progress-suffix');      
    }

    navigator.serviceWorker.ready.then((registration) => {
      console.log('Service Worker Connected...');
      return (new Promise((done, fail) => {
        const t0 = new Date().getTime();
        const i = setInterval(()=> {
          if(navigator.serviceWorker.controller){
            clearInterval(i);
            done();
          }
          if(new Date().getTime() - t0 > 5000){
            fail(new Error('No controller after 5 seconds'));
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
              if(data.error){
                return fail(data.error);
              }
              if(!data.remaining){
                done();
              } else {
                const progress = data.loading 
                  ? (data.loading - data.remaining) / data.loading
                  : 1;
                document.body.style.setProperty(
                  '--pwa-install-progress', progress
                );
                document.body.style.setProperty(
                  '--pwa-install-progress-suffix', `' ${Math.floor(100 * progress)}%'`
                );
                console.log('PWA Install Progress: ', Math.floor(100 * progress) + '%')
              }
            }
            navigator.serviceWorker.controller.postMessage({
              cmd: 'KEEP_ALIVE',
              timestamp: new Date().getTime()
            });
          }
          navigator.serviceWorker.controller.postMessage({
            cmd: 'LOAD_ASSETS',
          });    
        })
        .then(e => setInstalled(true))
        .catch(e => {
          setInstalled(false);
          throw e;
        });
      }
    }).catch(e=>{
      setInstalled(false);
      console.log('ERROR:', e);
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('MESSAGE:', event.data);
      if(event.data.reinstall){
        setInstalled(false);
        return;
      }
      if(window.onPWAMessage){
        window.onPWAMessage(event.data);
      }
    });

    navigator.serviceWorker
      .register('./sw.js')
      .then(function() { console.log('Service Worker Registered'); });
  }
});