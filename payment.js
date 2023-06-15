/*
Integrate payment processing to enable access levels. call functions from session.js
*/

class Payment{
  // Generate payment button
  static addBt(){
    return DOM.addHtml('.opts', `<button permanent="" onclick="Payment.payOpts()"><b>$</b></button>`);
  }

  // Generate payment popup to choose a plan
  static payOpts(){
    DOM.popup('Activate the game', `Licensing plans: <ul cards>${
      Object.entries(Payment.getPlans()).map(([key, [text, price]])=>
        `<li><button bt purchaseRef=${key}>$${price.toLocaleString()}</button>${text}</li>`
      ).join('')
    }</ul>`, []);
  }

  static getPlans(){
    return {
      'access1': ['Access level 1', 30000],
      'access2': ['Access level 2', 60000]
    }
  }
  
  // Call backend for signature. Choose between fake backend and real backend according to settings set by environment variable on deployment.
  
  // Ask session.js to update client access level
  
  // Show payment status / confirmation popup when comming back from payment platform
  
  // Submit payment info to backend for updating status and checking signature before showing payment status.
  
  // Implement backend SDK

}

window.addEventListener('load', Payment.addBt);