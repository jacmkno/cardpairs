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

  static async payuForm(ref, price, description){
    
    const signature = (await import('https://cdn.skypack.dev/crypto-js')).MD5("ApiKey~merchantId~referenceCode~amount~currency").toString()
    
    
    return `<form method="post" action="https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/">
      <input name="merchantId"      type="hidden"  value="508029"   >
      <input name="accountId"       type="hidden"  value="512321" >
      <input name="description"     type="hidden"  value="Test PAYU"  >
      <input name="referenceCode"   type="hidden"  value="${ref}" >
      <input name="amount"          type="hidden"  value="${price}"   >
      <input name="tax"             type="hidden"  value="0"  >
      <input name="taxReturnBase"   type="hidden"  value="0" >
      <input name="currency"        type="hidden"  value="COP" >
      <input name="signature"       type="hidden"  value="7ee7cf808ce6a39b17481c54f2c57acc"  >
      <input name="test"            type="hidden"  value="0" >
      <input name="buyerEmail"      type="hidden"  value="test@test.com" >
      <input name="responseUrl"     type="hidden"  value="http://www.test.com/response" >
      <input name="confirmationUrl" type="hidden"  value="http://www.test.com/confirmation" >
    </form>`;
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