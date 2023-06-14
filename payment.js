/*
Integrate payment processing to enable access levels. call functions from session.js
*/

class DOM {
  static addHtml(parentSelector, html){
    const n = (d=>(d.innerHTML = html) && d.children[0] )(document.createElement('div'));
    document.querySelector(parentSelector).appendChild(n);
    return n;
  }
}

class Payment{
  // Generate payment button
  static addBt(){
    return DOM.addHtml('.opts', `<button permanent="" onclick="Payment.payOpts()"><b>$</b></button>`);
  }

  // Generate payment popup to choose a plan
  static payOpts(){
    
  }
  
  // Call backend for signature. Choose between fake backend and real backend according to settings set by environment variable on deployment.
  
  // Ask session.js to update client access level
  
  // Show payment status / confirmation popup when comming back from payment platform
  
  // Submit payment info to backend for updating status and checking signature before showing payment status.
  
  // Implement backend SDK

}
