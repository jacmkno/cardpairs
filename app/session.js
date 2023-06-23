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

  static async getUnifiedLevels(){
    const byLevel = {}
    const levels = Object.values(this.getLevels());
    
    levels.forEach(([
        level, duration, startTime
      ]) => byLevel[level] = (
        byLevel[level] || []
      ).concat([[duration, startTime, startTime+duration]])
    );

    Object.entries(byLevel).forEach(([level, activations]) => {
      activations.sort(([,,endTime1], [,,endTime2]) => endTime1 - endTime2);
      const unified = [];
      activations.forEach(([duration, startTime, endTime], i) => {
        if(!i) {
          unified.push(activations[i]);
          return;
        }
        const l = unified.length - 1;
        const p = (([duration, startTime, endTime]) => (
          {duration, startTime, endTime})
        )(unified[l]);

        if(startTime < p.endTime){
          unified[l] = [p.duration + duration, p.startTime, p.endTime + duration];
        }else{
          unified.push(activations[i]);
        }
      });
      byLevel[level] = unified;
    });

    return byLevel;
  }

  static async getActiveLevels(){
    const levels = await this.getUnifiedLevels();
    Object.entries(levels).forEach(([level, activations])=>{
      levels[level] = activations.filter(([, startTime, endTime]) => 
        (t => t >= startTime && t <= endTime)(new Date().getTime()) )
    });
    return levels;
  }

  static async test(){
    async function test1(){
      class TestSession extends Session{
        static getLevels(){
          return {
            'a':['access1', 2592000000, 1687492166618],
            'b':['access1', 2592000000, 1687492166618-1000*3600*24*15],
            'c':['access1', 2592000000, 1687492166618-1000*3600*24*30],    
          }
        }
      }
      const levels = TestSession.getLevels();
      const unified = await TestSession.getUnifiedLevels();
      const active = await TestSession.getActiveLevels();
      return {levels: Object.values(levels).map(([l, ...v]) => v.map(v=>v/(3600*1000*24))), unified: unified.access1.map(a=>a.map(v=>v/(3600*1000*24))), active: active.access1.map(a=>a.map(v=>v/(3600*1000*24)))}  
    }

    async function test2(){
      class TestSession extends Session{
        static getLevels(){
          return {
            'a':['access1', 2592000000, 1687492166618],
            'b':['access1', 2592000000, 1687492166618-1000*3600*15],
            'c':['access1', 2592000000, 1687492166618-1000*3600*30],    
          }
        }
      }
      const levels = TestSession.getLevels();
      const unified = await TestSession.getUnifiedLevels();
      const active = await TestSession.getActiveLevels();
      return {levels: Object.values(levels).map(([l, ...v]) => v.map(v=>v/(3600*1000*24))), unified: unified.access1.map(a=>a.map(v=>v/(3600*1000*24))), active: active.access1.map(a=>a.map(v=>v/(3600*1000*24)))}  
    }
    
    async function test3(){
      class TestSession extends Session{
        static getLevels(){
          return {
            'a':['access1', 2592000000, 1687492166618],
            'b':['access1', 2592000000, 1687492166618-1000*3600*24*15],
            'c':['access1', 2592000000, 1687492166618-1000*3600*24*80],    
          }
        }
      }
      const levels = TestSession.getLevels();
      const unified = await TestSession.getUnifiedLevels();
      const active = await TestSession.getActiveLevels();
      return {levels: Object.values(levels).map(([l, ...v]) => v.map(v=>v/(3600*1000*24))), unified: unified.access1.map(a=>a.map(v=>v/(3600*1000*24))), active: active.access1.map(a=>a.map(v=>v/(3600*1000*24)))}  
    }

    return Promise.all([test1(), test2(), test3()]);
  }
}

console.log('XXX:', Session.getLevels());