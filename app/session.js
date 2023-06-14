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

  static popup(title, message, buttons){
    const btls = (() => {
      if(buttons){
        const rt = Object.entries(buttons);
        rt.unshift(['Cancel', ()=>document.querySelectorAll('.popup').forEach(p=>p.parentElement.removeChild(p))]);
        return rt;
      }else{
        return [];
      }
    })();
  
    DOM.addHtml('BODY', `<div class="popup">
        <label>${title}</label>
        <p>${message}</p>
        <div>${
          btls.map(([text], i)=>`<button bt>${text}</button>`).join('')
      }</div>
    </div>`);
  
    document.querySelectorAll('body > .popup:last-child button').forEach((n, i)=>{
      n.addEventListener('click', btls[i][1]);
    })
  }  
}


