let isSafari = false;

let _resize = null;
let _game = null;

let AUDIO_NICE = () => null;
let AUDIO_WRONG = () => null; //playPromise('Sorry...')

AUDIOS = {
  'Nice!': "sys-nice.mp3",
  'All kinds of things': "sys-all-kinds.mp3",
  'Transport': "sys-transport.mp3",
  'Flags': "sys-flags.mp3",
  'Upper/Lower Case': 'sys-upper-lower.mp3',
};

GENERATORS = {
  upperlower: function(desiredCards){
    const chars = 'abcdefghijklmnñopqrstuvwxyz'.split('');
    return chars.map(c => [c, `Letter ${c}`, c.toUpperCase()]);
  }
};
GENERATORS.upperlower.genAudios = true;

TEMPLATES = {
  'char': (v) => v
}

function renderCardTemplate(cardValue){
  if(typeof(cardValue) != 'object'){
    cardValue = {T:'char', 'v': cardValue};
  }
  return `<span class="img" template="${cardValue.T}">${TEMPLATES[cardValue.T](cardValue.v)}</span>`;
}

function audioFileName(text){
  return `${text.replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
}

function shuffle(a){
  return a.map(v => ({ v, s: Math.random() }))
    .sort(({s:a}, {s:b}) => a - b)
    .map(({ v }) => v);
}

function addTemporaryClass(element, className){
  element.classList.add(className);
  const tmpClassKey = '_tmpClassSrc_' + className;
  element[tmpClassKey] = {};
  const hovrSrc = element[tmpClassKey];
  setTimeout(() => {
    if(hovrSrc == element[tmpClassKey])
      element.classList.remove(className);
  }, 3000);    
}

function load(f, ...args){
  window._itemCnt = (window._items || 0) + 1
  const k = `_i${window._itemCnt}`;
  document.write(`<div id="${k}"></div>`);
  window.addEventListener('load', function(){
    const s = document.getElementById(k);
    const p = s.parentNode;
    p.removeChild(s);
    f(p, ...args);
  });
}

function playPromise(text){
  const url = window.location.pathname.replace(/\/$/,'') + '/audios/' + (AUDIOS[text]?AUDIOS[text]:audioFileName(text));
  const audio = new Audio(url);
  if(isSafari){
    return () => new Promise(r => {
      audio.setAttribute('src', url);
      audio.load();
      audio.play();
      audio.addEventListener("ended", e=>{
        r(true);
        a.pause();
      });
    });
  }
  let resolve = null;
  const play = () => new Promise(r => {
    resolve = r;
    audio.currentTime = 0;
    audio.play();
  });

  audio.addEventListener("ended", e=>{
    audio.pause();
    audio.currentTime = 0;
    if(resolve) resolve(true);
  });
  return play;
}

function updateGame(newSettings, preserveStatus=false){
  Object.assign(_game, newSettings);
  localStorage.cardGameSettings = JSON.stringify({..._game, wrapper: null});
  if(!preserveStatus) localStorage.removeItem('cardGameStatus');
  return cardGame(
    _game.wrapper,
    Math.max(_game.cols, 1),
    Math.max(_game.rows, 1),
    {type: _game.type, url: _game.url}
  );
}

function initializeCardGame(wrapper){
  isSafari = navigator.vendor.match(/apple/i) &&
    !navigator.userAgent.match(/crios/i) &&
    !navigator.userAgent.match(/fxios/i) &&
    !navigator.userAgent.match(/Opera|OPT\//);
  
  AUDIO_NICE = playPromise('Nice!');

  try{
    document.body.setAttribute('os', navigator.platform.toLowerCase().startsWith('win')?'windows':'not-windows');
  }catch(e){}
  
  if(!document.body.requestFullscreen && !document.body.webkitRequestFullscreen){
    document.querySelector('.opts button[onclick*="toggleFullScreen"]').style.display = 'none';
  }

  document.querySelectorAll('select[playOnChange]').forEach(s => {
    const audios = [...s.querySelectorAll('option')].map(o => playPromise(o.innerText));
    s.addEventListener('change', e => {
      audios[s.selectedIndex]();
    });
  });

  window.addEventListener('resize', e=>{
    if(_resize) _resize();
  });
  
  try{
    _game = JSON.parse(localStorage.cardGameSettings);
    _game.wrapper = wrapper;
  }catch(e){
    _game = null;
  }

  if(!_game){
    _game = {
      wrapper,
      cols: 4,
      rows: 4,
      type: 'utf8',
      url: 'cards-utf8-flags.json'
    }
  }

  document.body.addEventListener('touchend', e=>{
    document.querySelectorAll('.pressed').forEach(c => c.classList.remove('pressed'));
  });  

  document.querySelector('.opts select').value = _game.url;
  return updateGame({}, true);
}

async function cardGame(wrapper, cols, rows, {type, url}){
  _game = {wrapper, cols, rows, type, url};

  const _q = s => wrapper.querySelectorAll(s);
  const _ = s => wrapper.querySelector(s);

  if(url == 'cards-utf8-flags.json' && document.body.getAttribute('os') == 'windows') url = 'cards-utf8-flags-windows.json';

  const prevData = (()=>{
    try{
      return localStorage.cardGameStatus?JSON.parse(localStorage.cardGameStatus):null;
    }catch(e){
      return null;
    }
  })();

  const desiredCards = 2 * Math.floor(cols*rows/2);
  const slots = new Array(desiredCards).fill({});
  const hasPrevData = prevData && prevData.cards && prevData.cards[0].length == 3;
  // New on-memory card format is [key, templateValue, name]
  // Source format is [templateValue1, name1, templateValue2, < name2 ?> ...]
  const cards = hasPrevData ? prevData.cards : (
    (cardPatterns) => {
      const cards = [];
      while(cards.length < desiredCards && cardPatterns.length){
        const cardPattern = cardPatterns.pop();
        let lastCard = null;
        const patternCards = [];
        while(cardPattern.length){
          const c = cardPattern.splice(0,2);
          if(c.length < 2) c.push(lastCard?lastCard[2]:'');
          c.unshift(lastCard ? lastCard[0] : cards.length);
          if(c.length != 3) continue;
          patternCards.push(c);
          lastCard = c;
        }

        // Each pattern generates at least two cards
        if(patternCards.length == 1) patternCards.push(lastCard);

        if(cards.length + patternCards.length <= desiredCards) 
          cards.push(...patternCards);
      }
      return shuffle(cards);
    }
  )(
    shuffle(GENERATORS[url] ? GENERATORS[url](desiredCards) : await fetch(url).then(r => r.json()) )
  );

  const audioPromises = {};
  const audios = cards.map(c => audioPromises[c[2]] = 
      audioPromises[c[2]] ? audioPromises[c[2]] : playPromise(c[2])
  );
  const state = hasPrevData ? prevData.state : shuffle(slots);
  const classes = (i)=>{
    if(!prevData) return '';
    return `class="${[
      state[i].visible && 'visible',
      state[i].paired && 'paired'
    ].filter(c => c).join(' ') }"`;
      
  }
  wrapper.innerHTML = `<div class="cards">${
      state.map((e, i)=>
          `<div card="${cards[i]?cards[i][0]:''}" index="${i}" ${cards[i]?'':'missing'} ${classes(i)}>
            ${cards[i]?`
              <div class="wrap3dcard">
                <div class="front3dcard"></div>
                <div class="back3dcard">
                  ${renderCardTemplate(cards[i][1])}
                  <span class="desc">${cards[i][2]}</span>
                </div>
              </div>
            `:''}
          </div>`).join('\n')
      }</div>
      <div class="congrats">
          <div>Congratulations. Game completed!</div>
          <button>Restart</button>
            </div>`;
  
  wrapper.style.setProperty('--cols', cols);
  _('.cards').setAttribute('url', url);
  _q('.cards div[card]').forEach(c => {
    c.addEventListener('touchstart', e=>{
      e.target.classList.add('pressed');
    });  
  });

  const save = () => {
    const cNds = _q(`.cards div[card]`);
    localStorage.cardGameStatus = JSON.stringify({
      cards, state: state.map((v, i) => ({
        visible: cNds[i].classList.contains('visible'),
        paired: cNds[i].classList.contains('paired')
      }))
    });
  }
  const checkCompleted = () => {
    if(_q(`div[card].paired`).length == cards.length){
      wrapper.classList.toggle('completed');
    }
  }
  save();

  _('.cards').addEventListener('click', e=>{
    document.body.classList.remove('showAll');
    const card = parseInt(e.target.getAttribute('card'));
    const index = parseInt(e.target.getAttribute('index'));
    if(isNaN(card)) return;

    e.target.classList.remove('pressed');

    if(e.target.classList.contains('hover') && e.target.classList.contains('visible')){
      const visible = _q('.cards > div[card]:not(.paired).visible');
      if(visible.length >= 2){
        visible.forEach(e => {
          e.classList.remove('hover');
          e.classList.remove('visible')
        });
        return;
      }
    }

    addTemporaryClass(e.target, 'hover');

    let isMatch = false;
    let isWrong = false;
    audios[index]().then(() => {
      if(isMatch) AUDIO_NICE();
      if(isWrong) AUDIO_WRONG();
    });    

    if(e.target.classList.contains('visible')) return;    

    const visible = _q(`div[card]:not(.paired).visible`);
    if(visible.length >= 2){
        visible.forEach(c => c != e.target && c.classList.toggle('visible'));
    }
    
    e.target.classList.toggle('visible');
    
    const visibleEq = _q(`div[card="${card}"]:not(.paired).visible`);
    isMatch = visibleEq.length == 2;
    isWrong = !isMatch && _q(`div[card]:not(.paired).visible`).length > 1;
    if(isMatch){
      visibleEq.forEach(c => {
        c.classList.toggle('paired');
        addTemporaryClass(c, 'hover');
      });
    }

    checkCompleted();
    save();

  });

  _('.congrats button').addEventListener('click', e => {
    wrapper.classList.toggle('completed');
    updateGame({})
  });
  
  _resize = ()=>{
      const cards = _('.cards');
      if(!cards) return;
      cards.style.setProperty('--size', (()=>{
        const sampleCard = _('.cards div[card]');
        const size = Math.min(
          sampleCard.offsetWidth, 
          sampleCard.offsetHeight
        );
        return `${size}px`;
      })()
    );
  };
  checkCompleted();
  setTimeout(_resize, 0);
}

if(typeof(module) != 'undefined') module.exports = {AUDIOS, audioFileName, GENERATORS};
