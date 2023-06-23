/*
Integrate payment processing to enable access levels. call functions from session.js

Payment response params:
/?paymentop=response&merchantId=508029&merchant_name=Test+PayU&merchant_address=Av+123+Calle+12&telephone=7512354&merchant_url=http%3A%2F%2Fpruebaslapv.xtrweb.com&transactionState=4&lapTransactionState=APPROVED&message=APPROVED&referenceCode=AC11219145R2697&reference_pol=2149810463&transactionId=c1635605-1a6d-4c2f-b80b-d63f945e8065&description=Access+level+1&trazabilityCode=CRED+-+666368061&cus=CRED+-+666368061&orderLanguage=es&extra1=&extra2=&extra3=&polTransactionState=4&signature=93196a8f753101c4633eaadc559eb62a&polResponseCode=1&lapResponseCode=APPROVED&risk=&polPaymentMethod=12&lapPaymentMethod=AMEX&polPaymentMethodType=2&lapPaymentMethodType=CREDIT_CARD&installmentsNumber=6&TX_VALUE=30000.00&TX_TAX=.00&currency=COP&lng=es&pseCycle=&buyerEmail=sadfdsf%40asdfadf.com&pseBank=&pseReference1=&pseReference2=&pseReference3=&authorizationCode=193195&TX_ADMINISTRATIVE_FEE=.00&TX_TAX_ADMINISTRATIVE_FEE=.00&TX_TAX_ADMINISTRATIVE_FEE_RETURN_BASE=.00&processingDate=2023-06-20
/?paymentop=response&merchantId=508029&merchant_name=Test+PayU&merchant_address=Av+123+Calle+12&telephone=7512354&merchant_url=http%3A%2F%2Fpruebaslapv.xtrweb.com&transactionState=4&lapTransactionState=APPROVED&message=APPROVED&referenceCode=AC11219145R2698&reference_pol=2149810463&transactionId=c1635605-1a6d-4c2f-b80b-d63f945e8065&description=Access+level+1&trazabilityCode=CRED+-+666368061&cus=CRED+-+666368061&orderLanguage=es&extra1=&extra2=&extra3=&polTransactionState=4&signature=93196a8f753101c4633eaadc559eb62a&polResponseCode=1&lapResponseCode=APPROVED&risk=&polPaymentMethod=12&lapPaymentMethod=AMEX&polPaymentMethodType=2&lapPaymentMethodType=CREDIT_CARD&installmentsNumber=6&TX_VALUE=30000.00&TX_TAX=.00&currency=COP&lng=es&pseCycle=&buyerEmail=sadfdsf%40asdfadf.com&pseBank=&pseReference1=&pseReference2=&pseReference3=&authorizationCode=193195&TX_ADMINISTRATIVE_FEE=.00&TX_TAX_ADMINISTRATIVE_FEE=.00&TX_TAX_ADMINISTRATIVE_FEE_RETURN_BASE=.00&processingDate=2023-06-20

*/

class Payment{

  // Generate payment button
  static addBt(){
    const GET = Object.fromEntries([...new URLSearchParams(window.location.search)]);
    if(GET.paymentop == 'response'){
      Payment.checkReponse(GET);
    }

    return DOM.addHtml('.opts', `<button permanent="" onclick="Payment.payOpts()"><b>$</b></button>`);
  }

  // Generate payment popup to choose a plan
  static async payOpts(){
    const plans = Object.entries(Payment.getPlans());
    const popup = DOM.popup('Activate the game', `Licensing plans: <ul cards>${
      plans.map(([, [text, price]])=>
        `<li><button bt>$${price.toLocaleString()}</button>${text}</li>`
      ).join('')
    }</ul>`, []);

    popup.querySelectorAll('li > button').forEach((bt, i)=>{
      const [, [text, price, refPrefix]] = plans[i];
      bt.addEventListener('click', ()=>Payment.startPayment(refPrefix, price, text));
    });
  }

  static async hash(s, algo='md5'){
    if(algo=='md5'){
      return (await import('https://cdn.skypack.dev/crypto-js')).MD5(s).toString();
    }
    return Array.from(new Uint8Array(await crypto.subtle.digest(algo, new TextEncoder().encode(s)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static getMerchant(){
    const [
      ApiKey,
      merchantId,
      accountId
    ] = ['4Vj8eK4rloUd272L48hsrarnUA', 508029, 512321];
    return [ApiKey, merchantId, accountId];
  }

  static async startPayment(refPrefix, price, description){
    const [
      ApiKey,
      merchantId,
      accountId
    ] = Payment.getMerchant();

    const [
      paymentUrl,
      confirmationUrl,
      referenceCode,
      amount,
      currency
    ] = [
      'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
      new URL('payu/confirmation', window.location.href).href, Payment.referenceCode(refPrefix), price, 'COP'
    ];
    
    const signature = await Payment.hash(
      [ApiKey, merchantId, referenceCode, amount, currency].join('~')
    );
    
    const div = document.createElement('div');
    div.innerHTML = `<form method="post" action="${paymentUrl}">
      <input name="merchantId"      type="hidden"  value="${merchantId}"   >
      <input name="accountId"       type="hidden"  value="${accountId}" >
      <input name="description"     type="hidden"  value="${description}"  >
      <input name="referenceCode"   type="hidden"  value="${referenceCode}" >
      <input name="amount"          type="hidden"  value="${price}"   >
      <input name="tax"             type="hidden"  value="0"  >
      <input name="taxReturnBase"   type="hidden"  value="0" >
      <input name="currency"        type="hidden"  value="COP" >
      <input name="signature"       type="hidden"  value="${signature}"  >
      <input name="test"            type="hidden"  value="0" >
      <input name="responseUrl"     type="hidden"  value="${new URL('?paymentop=response', window.location.href).href }" >
      <input name="confirmationUrl" type="hidden"  value="${ confirmationUrl }" >
    </form>`;
    div.style.display = 'none';
    document.body.appendChild(div);
    div.childNodes[0].submit();
    document.body.removeChild(div);
  }

  static payuRound(v){
    // Approximate the TX_VALUE to a decimal, using the rounding method Round half to even
    // https://developers.payulatam.com/latam/en/docs/integrations/webcheckout-integration/response-page.html
    return ((n, D=10) => (((r, nD, n) => ((Math.abs(r-nD) == 0.5)?[Math.ceil(nD), Math.floor(nD)].filter(n=>!(n%2))[0]:Math.round(nD))/D))( Math.round(n*D), n*D, n ))(
      parseFloat(v)
    ).toFixed(1);
  }

  static async checkReponse(GET){
    const [
      ApiKey,
      merchantId
    ] = Payment.getMerchant();

    const [
      req_merchantId,
      referenceCode,
      amount,
      currency,
      transactionState,
      req_signature
    ] = [
      GET.merchantId, GET.referenceCode,
      Payment.payuRound(GET.TX_VALUE),
      GET.currency,
      GET.transactionState,
      GET.signature
    ];
    
    const expected_signature = await Payment.hash(
      [ApiKey, merchantId, referenceCode, amount, currency, transactionState].join('~')
    );

    const PLANS = Payment.getPlans();
    const plan = Object.entries(PLANS).filter(([,[,,ref]])=>referenceCode.startsWith(ref)).map(([plan])=>plan).pop();


    const response = (expected_signature == req_signature)?({
      "4": "approved",
      "5": "invalid",
      "6": "rejected" 
    }[transactionState]??'pending'): 'invalid';

    if(response == 'approved'){
      const [planName, [,,,duration]] = [plan, PLANS[plan]];
      Session.activate(referenceCode, plan, duration);
      DOM.popup('Payment Confirm: ' + response, 
        `Your plan "${planName}" has been activated.<br/>Thanks for your payment.`, 
        [['OK', e => location = location.pathname]], false
      );
    }else{
      DOM.popup('Payment Response: ' + response, 
        `Your payment was not accepted.<br/>You can retry payment any time.`, 
        [['OK', e => location = location.pathname]], false
      );
    }
  }

  static getPlans(){
    return {
      'access1': ['Access level 1', 30000, 'AC1', 3600*1000*24*30],
      'access2': ['Access level 2', 60000, 'AC2', 3600*1000*24*30]
    }
  }

  static referenceCode(prefix){
    const firstTime = 1687292582948;
    return prefix + (new Date().getTime() - firstTime)+'R' +(1000+Math.floor(Math.random()*9000))
  }
  
  // Call backend for signature. Choose between fake backend and real backend according to settings set by environment variable on deployment.
  
  // Ask session.js to update client access level
  
  // Show payment status / confirmation popup when comming back from payment platform
  
  // Submit payment info to backend for updating status and checking signature before showing payment status.
  
  // Implement backend SDK

}


window.addEventListener('load', Payment.addBt);