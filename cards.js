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
};

function audioFileName(text){
  return `${text.replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
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
      const a = audio.cloneNode();
      a.play();
      a.addEventListener("ended", e=>{
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

  const slots = new Array(Math.floor(cols*rows/2))
      .fill(0).map((e,i)=>i);
  slots.push(...slots);
  
  const cards = prevData?prevData.cards:(await fetch(url).then(r => r.json()))
    .map(v => ({ v, s: Math.random() }))
    .sort(({s:a}, {s:b}) => a - b)
    .map(({ v }) => v)
    .slice(0, slots.length/2);
  const audios = cards.map(c => playPromise(c[1]));
  const positions = prevData
    ? prevData.positions.map(p => p.card)
    : slots.map(v => ({ v, s: Math.random() }))
      .sort(({s:a}, {s:b}) => a - b)
      .map(({ v }) => v);
  const classes = (i)=>{
    if(!prevData) return '';
    return `class="${[
      prevData.positions[i].visible && 'visible',
      prevData.positions[i].paired && 'paired'
    ].filter(c => c).join(' ') }"`;
      
  }
  wrapper.innerHTML = `<div class="cards">${
        positions.map((e, i)=>
          `<div card="${e}" ${cards[e]?'':'missing'} ${classes(i)}>
            ${cards[e]?`
              <span class="img">${cards[e][0]}</span>
              <span class="desc">${cards[e][1]}</span>
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
      cards, positions: positions.map((v, i) => ({
        card: v,
        visible: cNds[i].classList.contains('visible'),
        paired: cNds[i].classList.contains('paired')
      }))
    });
  }
  const checkCompleted = () => {
    if(_q(`div[card].paired`).length == cards.length * 2){
      wrapper.classList.toggle('completed');
    }
  }
  save();

  _('.cards').addEventListener('click', e=>{
    document.body.classList.remove('showAll');
    const card = parseInt(e.target.getAttribute('card'));
    if(isNaN(card)) return;

    let isMatch = false;
    let isWrong = false;
    audios[card]().then(() => {
      if(isMatch) AUDIO_NICE();
      if(isWrong) AUDIO_WRONG();
    });

    e.target.classList.add('hover');
    e.target.classList.remove('pressed');
    setTimeout(() => e.target.classList.remove('hover'), 3000);    

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
      visibleEq.forEach(c => c.classList.toggle('paired'));
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

if(typeof(module) != 'undefined') module.exports = {AUDIOS, audioFileName};
