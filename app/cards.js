let isSafari = false;

let _resize = null;
let _game = null;

let AUDIO_NICE = () => null;
let AUDIO_WRONG = () => null; //playPromise('Sorry...')
const ScoreManager = new ScoreKeeper();

AUDIOS = {
  'Nice!': "sys-nice.mp3",
  'All kinds of things': "sys-all-kinds.mp3",
  'Transport': "sys-transport.mp3",
  'Flags': "sys-flags.mp3",
  'Upper/Lower Case': 'sys-upper-lower.mp3',
  'Sums & Subtractions': 'sys-addition-subtraction.mp3',
  'Animals': 'sys-animals.mp3',
  'Activities': 'sys-activities.mp3',
  'Food': 'sys-food.mp3',
  'Objects': 'sys-objects.mp3',
  'People': 'sys-people.mp3',
  'Smileys': 'sys-smileys.mp3',
  'Symbols': 'sys-symbols.mp3',
  'Travel': 'sys-travel.mp3'
};


GENERATORS = {
  upperlower: function(desiredCards){
    const chars = 'abcdefghijklmnñopqrstuvwxyz'.split('');
    return chars.map(c => [c, `Letter ${c}`, c.toUpperCase()]);
  },
  sum: function(desiredCards){
    return new Array(desiredCards).fill(0).map((e, i) => {
      let n = Math.floor(Math.random() * i * 1.5);
      return [{T:'sum', v:[n, i - n]}, '', {T:'num', v:i}];
    });
  },
  nums: function(desiredCards){
    return new Array(desiredCards).fill(0).map((e, i) => {
      return [{T:'num', v:i}];
    });
  },
  mult10: function(desiredCards){
    return Object.values(new Array(10).fill(0).map((_,i)=>new Array(10).fill(0).map((_, j)=>[i,j,i*j]) )
      .flat()
      .reduce((a,[x,y,r])=>Object.assign(a, {[r]: (a[r]??[]).concat([[x,y,r]])}),{}))
      .map(a=>(i=>a[i])(Math.floor(Math.random()*a.length))
).map(([a,b,v])=>[{T:'mul', v: [a,b]},'', {T:'num', v}]);
  }
  // new Array(10).fill(0).map((_,i)=>new Array(10).fill(0).map((_, j)=>[i,j,i*j]) ).flat()
};
GENERATORS.upperlower.genAudios = true;

TEMPLATES = {
  'char': (v) => v,
  'sum': (numbers) => {
    const rt = numbers.map(n => (n >= 0)?`+${n}`:n).join('');
    return rt.startsWith('+') ? rt.substr(1) : rt;
  },
  'mul': ([a,b])=> `${a}×${b}`,
  'num': (v) => v
}

function supportsEmoji(e) {
  const em = 16;
  var ctx = (()=>{
    if(!this.UTF_SUPPORT_CTX){
      var c = document.createElement("canvas")
      c.setAttribute('willReadFrequently', true);
      this.UTF_SUPPORT_CTX = c.getContext("2d");
      c.width = em;
      c.height = em;
    }
    return this.UTF_SUPPORT_CTX;
  })();
  
  //https://en.wikipedia.org/wiki/Specials_(Unicode_block) (NON-Character)
  var unsupported = (() => {
    if(!this.UTF_UNSUPPORTED){
      this.UTF_UNSUPPORTED = ["\uFFFF", "\uFFFF\uFFFF", "\uFFFF\uFFFF\uFFFF"].map(b => {
        ctx.clearRect(0, 0, em, em);
        ctx.fillText(b, 0, em);
        let d = ctx.getImageData(0, 0, em, em).data
        let sum = d.reduce((acc, cur) => {
          return acc + cur
        })
        return sum
      });  
    }
    return this.UTF_UNSUPPORTED;
  })()

  ctx.clearRect(0, 0, em, em);
  ctx.fillText(e, 0, em);
  let d = ctx.getImageData(0, 0, em, em).data
  let sum = d.reduce((acc, cur) => {
    return acc + cur
  })
  return !unsupported.some(b => b == sum)?1:0
}

async function loadUTF8Cards(url){
  document.body.classList.add('loading');
  const fq = await fetch('cards/' + url).then(r=>r.json());
  if(document.body.getAttribute('os') == 'windows'){
    // All emojis are assumed included in the windows webfont. Confirmed on testing for notofont. 
    return fq;
  }

  const supportedEmoji = localStorage.supportedEmoji ? JSON.parse(localStorage.supportedEmoji) : {};
  const rt = fq.filter(card => {
    for(let i = 0; i < card.length; i += 2){
      const c = card[i];
      if(supportedEmoji[c] === undefined){
        supportedEmoji[c] = supportsEmoji(c);
      }
      if(!supportedEmoji[c]){
        console.log('UNSUPORTED:', c);
        return false;
      }
    }
    return true;
  });
  localStorage.supportedEmoji = JSON.stringify(supportedEmoji);
  document.body.classList.remove('loading');
  return rt;
}


function renderCardTemplate(cardValue){
  if(typeof(cardValue) != 'object'){
    cardValue = {T:'char', 'v': cardValue};
  }
  return `<span class="img" template="${cardValue.T}">${TEMPLATES[cardValue.T](cardValue.v)}</span>`;
}

function audioFileName(text){
  const fname = text.replace(/[^a-zA-Z0-9]/g, '-');
  return fname.length?`${fname}.mp3`:null;
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
  const afname = AUDIOS[text]?AUDIOS[text]:audioFileName(text);
  if(!afname) return async ()=>true;
  const url = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'audios/' + afname;
  const audio = new Audio(url);
  if(isSafari){
    return () => new Promise(r => {
      audio.setAttribute('src', url);
      audio.load();
      audio.play().catch(e=>{
        r(true);
      });
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
    audio.play().catch(e=>{
      r(true);
    });
  });

  audio.addEventListener("ended", e=>{
    audio.pause();
    audio.currentTime = 0;
    if(resolve) resolve(true);
  });
  return play;
}

function updateGame(newSettings, preserveStatus=false){
  const gameSelector = document.querySelector('select[playOnChange]');
  if(gameSelector){
    const scoreGame = ((s,a)=>s.options[s.selectedIndex].getAttribute(a))(gameSelector, 'game');
    ScoreManager.setGame(scoreGame);
  }

  if(!preserveStatus){
    document.querySelector('.game').classList.remove('completed');
  }
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

  playOnChange();

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

  mainMenu();

  return updateGame({}, true);
}

async function cardGame(wrapper, cols, rows, {type, url}){
  _game = {wrapper, cols, rows, type, url};

  const _q = s => wrapper.querySelectorAll(s);
  const _ = s => wrapper.querySelector(s);

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
    shuffle(GENERATORS[url] ? GENERATORS[url](desiredCards) : await loadUTF8Cards(url) )
  );

  if(cards.length < desiredCards - 2){
    document.body.classList.add('max-reached');
  } else {
    document.body.classList.remove('max-reached');
  }

  if(desiredCards <= 4){
    document.body.classList.add('min-reached');
  }else{
    document.body.classList.remove('min-reached');
  }

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
  ScoreManager.setReward(state.length);
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
      })() );

      setTimeout(() => _q('.cards div[card] .img').forEach(img => {
        const [W, H] = [img.parentNode.offsetWidth, img.parentNode.offsetHeight];
        const M = 0.5 * Math.min(...[W, H]); // Margin
        const [w, h] = [img.offsetWidth + M, img.offsetHeight + M];
        img.style.setProperty('--cardzoom', 1/Math.max(...[w/W, h/H]))
      }), 50);
  };

  window.addEventListener('resize', function(){
    if(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement )
      document.body.classList.add('fullscreen');
    else
      document.body.classList.remove('fullscreen');
  })

  checkCompleted();
  setTimeout(_resize, 0);
}


function popup(html, beforeDOM=(e=>null)){
    const div = document.createElement('div');
    div.className = 'popup';
    div.innerHTML = `<div class="congrats">
            ${html}
            <nav>
              <button close>Close</button>
            </nav>
    </div>`;

    const close = () => document.body.removeChild(div);

    beforeDOM(div, close);
  
    div.querySelector('button[close]')
      .addEventListener('click', close);

    div.addEventListener('click', close);
  
    div.querySelector(':scope > div')
      .addEventListener('click', 
        e => e.stopPropagation()
      );
  
    document.body.appendChild(div);
    return div; 
}

function mainMenu(){
  popup(`<h2>Finding Pairs</h2> <div class="opts settings">
            <div>
              <label>Size</label>
              <span>
                <button onclick="updateGame({cols: _game.cols-1})"><b>↞</b></button>
                <button onclick="updateGame({rows: _game.rows-1})"><b>↟</b></button>
                <button onclick="updateGame({cols: _game.cols+1})"><b>↠</b></button>
                <button onclick="updateGame({rows: _game.rows+1})"><b>↡</b></button>
                <button permanent onclick="showAll()"><b>👁</b></button>
              </span>
            </div>
            <div>
              <label>Card Set</label>
              <select playOnChange onchange="updateGame({url: this.value});">
                <option game="memory" value="cards-utf8-animals.json">Animals</option>
                <option game="memory" value="cards-utf8-activities.json">Activities</option>
                <option game="memory" value="cards-utf8-food.json">Food</option>
                <option game="memory" value="cards-utf8-objects.json">Objects</option>
                <option game="memory" value="cards-utf8-people.json">People</option>
                <option game="memory" value="cards-utf8-smileys.json">Smileys</option>
                <option game="memory" value="cards-utf8-symbols.json">Symbols</option>
                <option game="memory" value="cards-utf8-travel.json">Travel</option>
                <!-- <option value="cards-utf8-stuff.json">All kinds of things</option>-->
                <option game="memory" value="cards-utf8-transport.json">Transport</option>
                <option game="memory" value="cards-utf8-flags.json">Flags</option>
                <option game="reading" value="upperlower">Upper/Lower Case</option>
                <option game="math" value="sum">Sums &amp; Subtractions</option>
                <option game="memory" value="nums">Numbers</option>
                <option game="math" value="mult10">Mutpliplication up to 10</option>              
              </select>
            </div>
      </div>
  `, (div, close) => {
      div.querySelector('nav').innerHTML += `
        <button start>New Game</button>
      `;
      div.querySelector('button[start]').addEventListener('click', e=>{
        updateGame({});
        close();
      });
      div.querySelector('.opts select').value = _game.url;
  });
  playOnChange();
}

function playOnChange(){
  document.querySelectorAll('select[playOnChange]:not([ready])').forEach(s => {
    s.setAttribute('ready',1);
    const audios = playOnChange.audios || 
      [...s.querySelectorAll('option')].map(o => playPromise(o.innerText));
    playOnChange.audios = audios;
    s.addEventListener('change', e => {
      audios[s.selectedIndex]();
    });
  });  
}

if(typeof(module) != 'undefined') module.exports = {AUDIOS, audioFileName, GENERATORS};
