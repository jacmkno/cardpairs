/*
  Determine access level, enable /disable features according to access level.
  
  // Identify client with a key in localStorage

  // Check access level from localstorage and fallback to backend
  
  // enable / disable features according to access level
*/


class DOM {
  static addHtml(parentSelector, html){
    const n = (d=>(d.innerHTML = html) && d.children[0] )(document.createElement('div'));
    document.querySelector(parentSelector).appendChild(n);
    return n;
  }

  static popup(title, message, buttons, addCancel=true){
    const close = ()=>document.querySelectorAll('.popup').forEach(p=>p.parentElement.removeChild(p));
    const btls = (() => {
      if(buttons){
        const rt = Array.isArray(buttons)?buttons:Object.entries(buttons);
        const closeBts = rt.filter(o=>o.length === 1);
        if(!closeBts.length && addCancel){
          rt.unshift(['Cancel', close]);
        }
        closeBts.forEach(o=>o.push(close));
        return rt;
      }else{
        return [];
      }
    })();
  
    const rt = DOM.addHtml('BODY', `<div class="popup">
        <label>${title}</label>
        <p>${message}</p>
        <div>${
          btls.map(([text], i)=>`<button bt>${text}</button>`).join('')
      }</div>
    </div>`);
  
    rt.querySelectorAll(':scope > div button').forEach((n, i)=>{
      n.addEventListener('click',  e => btls[i][1](e, close));
    });
    
    return rt;
  }  
}


class Session{
  static setLevel(activationId, level, durationMS){
    const L = Session.getLevels();
    L[activationId] = [level, durationMS, new Date().getTime()];
    localStorage.levels = JSON.stringify(L);
  }

  static getLevels(){
    try{
      return JSON.parse(localStorage.levels);
    }catch(e){}
    return {};
  }
}
console.log('XXX:', Session.getLevels());