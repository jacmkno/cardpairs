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

let _resize = null;
let _game = null;

function updateGame(newSettings){
  Object.assign(_game, newSettings);
  localStorage.cardGameSettings = JSON.stringify({..._game, wrapper: null});
  return cardGame(
    _game.wrapper,
    Math.max(_game.cols, 1),
    Math.max(_game.rows, 1),
    {type: _game.type, url: _game.url}
  );
}

function initializeCardGame(wrapper){
  try{
    _game = JSON.parse(localStorage.cardGameSettings);
  }catch(e){
    _game = null;
  }
  _game.wrapper = wrapper;

  if(!_game || !_game.wrapper){
    _game = {
      cols: 4,
      rows: 4,
      type: 'utf8',
      url: 'cards-utf8-flags.json'
    }
  }
  document.querySelector('.opts select').value = _game.url;
  return updateGame({});
}

async function cardGame(wrapper, cols, rows, {type, url}){
  _game = {wrapper, cols, rows, type, url};

  const _q = s => wrapper.querySelectorAll(s);
  const _ = s => wrapper.querySelector(s);
  const slots = new Array(Math.floor(cols*rows/2))
      .fill(0).map((e,i)=>i);
  slots.push(...slots);

  const cards = (await fetch(url).then(r => r.json()))
    .map(v => ({ v, s: Math.random() }))
    .sort(({s:a}, {s:b}) => a - b)
    .map(({ v }) => v)
    .slice(0, slots.length/2);
    
                          
  wrapper.innerHTML = `<div class="cards">${
      slots.map(v => ({ v, s: Math.random() }))
        .sort(({s:a}, {s:b}) => a - b)
        .map(({ v }) => v)
        .map((e, i)=>
          `<div card="${e}" ${cards[e]?'':'missing'}>
            ${cards[e]?`
              <span class="img">${cards[e][0]}</span>
              <span class="desc">${cards[e][1]}</span>
            `:''}
          </div>`).join('\n')
      }</div>
      <div class="congrats">
          Congratulations. Game completed!
          <button>Restart</button>
            </div>`;
    
  wrapper.style.setProperty('--cols', cols);
  
  _q('.cards div[card]').forEach(c => {
    c.addEventListener('touchstart', e=>{
      e.target.classList.add('pressed');
    });
  
    c.addEventListener('touchend', e=>{
      setTimeout(e=>e.target.classList.remove('pressed'), 150);
    });
  });

  _('.cards').addEventListener('click', e=>{
    const card = parseInt(e.target.getAttribute('card'));
    if(isNaN(card)) return;

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
    if(visibleEq.length == 2){
        visibleEq.forEach(c => c.classList.toggle('paired'));
    }
    
    if(_q(`div[card].paired`).length == cards.length){
        wrapper.classList.toggle('completed');
    }
  });

  _('.congrats button').addEventListener('click', 
      e=>{
        wrapper.classList.toggle('completed');
        cardGame(wrapper, cols, rows)
    }
  );
  
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
  setTimeout(_resize, 0);
}

window.addEventListener('resize', e=>{
    if(_resize) _resize();
})