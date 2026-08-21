/* Final guard for factory-sealed flow and stale multi-item placeholders. */
(function(){
  "use strict";
  const KEY="gearCashOutQuoteBasket";
  const form=document.getElementById("quote-form");
  if(!form)return;

  function clean(v){return String(v==null?"":v).trim();}
  function placeholder(v){const s=clean(v).toLowerCase();return !s||/^[-–—]/.test(s)||/\bselect\b/.test(s);}
  function valid(item){
    if(!item||typeof item!=="object")return false;
    if(placeholder(item.category)||placeholder(item.manufacturer)||placeholder(item.model))return false;
    if(item.category==="drone"&&placeholder(item.package))return false;
    return true;
  }
  function sanitiseBasket(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      const cleanBasket=Array.isArray(parsed)?parsed.filter(valid):[];
      if(JSON.stringify(cleanBasket)!==JSON.stringify(parsed))localStorage.setItem(KEY,JSON.stringify(cleanBasket));
    }catch(_){localStorage.removeItem(KEY);}
  }
  function currentStep(){const s=form.querySelector('.wizard-step:not([hidden])');return s?Number(s.dataset.step):null;}
  function sealed(){return form.querySelector('input[name="condition"]:checked')?.value==="factory-sealed";}
  function show(n){
    form.querySelectorAll('.wizard-step').forEach(s=>{s.hidden=Number(s.dataset.step)!==n;});
    if(window.updateProgressIndicator)window.updateProgressIndicator(n);
    window.setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),0);
  }
  function clearSealedIrrelevantData(){
    ["flight-hours","gear-usage-count","damage-description"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    form.querySelectorAll('.battery-entry').forEach(el=>el.remove());
    ["package-contents-list","additional-accessories-list","additional-items-v2"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML="";});
    form.querySelectorAll('input[name="flightHoursRange"],input[name="unbound"],input[name="damage"]').forEach(el=>el.checked=false);
  }

  /* Capture before the legacy wizard handlers. This makes factory-sealed
     routing authoritative: no battery/usage/unbound/damage/package-content
     steps are shown. */
  form.addEventListener("click",function(event){
    const button=event.target.closest("button");
    if(!button||!form.contains(button))return;
    const n=currentStep();
    if(n===4&&button.classList.contains("btn-next")&&sealed()){
      event.preventDefault();event.stopImmediatePropagation();
      clearSealedIrrelevantData();
      show(10);
    }
  },true);

  document.addEventListener("DOMContentLoaded",function(){sanitiseBasket();});
  sanitiseBasket();
})();
