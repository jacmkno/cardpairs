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
  static activate(activationId, level, durationMS){
    const L = Session.getActivations();
    if(!L[activationId]){
      L[activationId] = [level, durationMS, new Date().getTime()];
      localStorage.session_activations = JSON.stringify(L);
      const currentAccess = this.getLevel();
      if(currentAccess){
        // Extend current access regardless of level. Other layer should prevent conflicting actications.
        currentAccess.expiration += durationMS;
        localStorage.session_level = JSON.stringify(currentAccess);
      }else{
        localStorage.session_level = JSON.stringify({level, expiration:new Date().getTime() + durationMS});
      }
    }
  }

  static getActivations(){
    try{
      return JSON.parse(localStorage.session_activations);
    }catch(e){}
    return {};
  }

  static getLevel(){
    try{
      const rt = JSON.parse(localStorage.session_level);
      if(rt.expiration < new Date().getTime()){
        return null;
      }
      return rt;
    }catch(e){}
    return null;    
  }
}

console.log('XXX:', Session.getActivations());