/*
Integrate payment processing to enable access levels. call functions from session.js
*/

class Payment{
  // Generate payment button
  static addBt(){
    return DOM.addHtml('.opts', `<button permanent="" onclick="Payment.payOpts()"><b>$</b></button>`);
  }

  // Generate payment popup to choose a plan
  static async payOpts(){
    const plans = Object.entries(Payment.getPlans());
    const popup = DOM.popup('Activate the game', `Licensing plans: <ul cards>${
      plans.map(([ref, [text, price]])=>
        `<li><button bt>$${price.toLocaleString()}</button>${text}</li>`
      ).join('')
    }</ul>`, []);

    popup.querySelectorAll('li > button').forEach((bt, i)=>{
      const [ref, [text, price]] = plans[i];
      bt.addEventListener('click', ()=>Payment.startPayment(ref, price, text));
    });
  }

  static async hash(s, algo='md5'){
    if(algo=='md5'){
      return (await import('https://cdn.skypack.dev/crypto-js')).MD5(s).toString();
    }
    return Array.from(new Uint8Array(await crypto.subtle.digest(algo, new TextEncoder().encode(s)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async startPayment(ref, price, description){
    const [
      paymentUrl,
      confirmationUrl,
      ApiKey,
      merchantId,
      accountId,
      referenceCode,
      amount,
      currency
    ] = [
      'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
      new URL('payu/confirmation', window.location.href).href,
      '4Vj8eK4rloUd272L48hsrarnUA', 508029, 512321, ref, price, 'COP'
    ];
    
    const signature = await Payment.hash(
      [ApiKey, merchantId, referenceCode, amount, currency].join('~')
    );
    
    const div = document.createElement('div');
    div.innerHTML = `<form method="post" action="${paymentUrl}">
      <input name="merchantId"      type="hidden"  value="${merchantId}"   >
      <input name="accountId"       type="hidden"  value="${accountId}" >
      <input name="description"     type="hidden"  value="${description}"  >
      <input name="referenceCode"   type="hidden"  value="${ref}" >
      <input name="amount"          type="hidden"  value="${price}"   >
      <input name="tax"             type="hidden"  value="0"  >
      <input name="taxReturnBase"   type="hidden"  value="0" >
      <input name="currency"        type="hidden"  value="COP" >
      <input name="signature"       type="hidden"  value="${signature}"  >
      <input name="test"            type="hidden"  value="0" >
      <input name="responseUrl"     type="hidden"  value="${new URL('payu/response', window.location.href).href }" >
      <input name="confirmationUrl" type="hidden"  value="${ confirmationUrl }" >
    </form>`;
    div.style.display = 'none';
    document.body.appendChild(div);
    div.childNodes[0].submit();
    document.body.removeChild(div);
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