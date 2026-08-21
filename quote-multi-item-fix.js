/* Multi-item quote wizard: keep each item separate, preserve photos,
   allow customers to remove mistaken items, resume an unfinished basket,
   and discard incomplete placeholder entries. */
(function(){
  "use strict";
  const form=document.getElementById("quote-form");
  if(!form)return;
  const BASKET_KEY="gearCashOutQuoteBasket";
  const basket=()=>{
    try{
      const raw=localStorage.getItem(BASKET_KEY);
      const b=raw?JSON.parse(raw):[];
      if(!Array.isArray(b))return[];
      const valid=b.filter(isCompleteItem);
      if(valid.length!==b.length) localStorage.setItem(BASKET_KEY,JSON.stringify(valid));
      return valid;
    }catch(_){return[]}
  };
  const saveBasket=b=>{try{localStorage.setItem(BASKET_KEY,JSON.stringify(b));}catch(_){} };
  const clean=v=>String(v||"").trim();
  const selectedText=id=>{const el=document.getElementById(id);return el?.selectedIndex>=0?el.options[el.selectedIndex].textContent.trim():""};
  const checked=name=>form.querySelector(`input[name="${name}"]:checked`)?.value||"";

  function isPlaceholder(v){
    const s=clean(v).toLowerCase();
    return !s || /^[-–—]/.test(s) || /\bselect\b.*\b(model|package|accessory|manufacturer)\b/.test(s);
  }
  function isCompleteItem(item){
    if(!item || typeof item!=="object")return false;
    if(isPlaceholder(item.category) || isPlaceholder(item.categoryName))return false;
    if(isPlaceholder(item.manufacturer) || isPlaceholder(item.manufacturerName))return false;
    if(isPlaceholder(item.model) || isPlaceholder(item.modelName))return false;
    if(item.category==="drone" && (isPlaceholder(item.package) || isPlaceholder(item.packageName)))return false;
    return true;
  }

  function ensureState(){if(!Array.isArray(window.__gcoMultiItemFiles))window.__gcoMultiItemFiles=[];if(window.__gcoCurrentItemIndex===undefined)window.__gcoCurrentItemIndex=null;}

  function getAutomaticResultFromCore(){
    try{
      if(typeof window.showStep!=="function")return null;
      window.showStep(12);
      const priceEl=document.querySelector('[data-step="12"] .quote-price');
      if(!priceEl)return null;
      const text=clean(priceEl.textContent).replace(/[^0-9.\-]/g,"");
      const amount=Number(text);
      if(!Number.isFinite(amount))return null;
      return {status:"automatic",amount:amount};
    }catch(_){return null;}
  }

  function collectItem(){
    const equipmentStatus=document.getElementById("equipment-serial-status")?.value||"available";
    const controllerStatus=document.getElementById("controller-serial-status")?.value||"not-applicable";
    const q={
      category:clean(document.getElementById("gear-category")?.value),
      categoryName:selectedText("gear-category"),
      manufacturer:clean(document.getElementById("gear-manufacturer")?.value),
      manufacturerName:selectedText("gear-manufacturer"),
      model:clean(document.getElementById("dji-model")?.value),
      modelName:selectedText("dji-model"),
      package:clean(document.getElementById("package-select")?.value),
      packageName:selectedText("package-select"),
      condition:checked("condition"),
      flightHours:clean(document.getElementById("flight-hours")?.value),
      flightHoursRange:checked("flightHoursRange"),
      batteries:Array.from(form.querySelectorAll(".battery-entry")).map(row=>({type:clean(row.querySelector(".battery-type")?.value),cycles:Number(row.querySelector(".battery-cycles")?.value||0)})),
      unbound:checked("unbound"),
      damage:checked("damage"),
      damageDescription:clean(document.getElementById("damage-description")?.value),
      packageContents:Object.fromEntries(Array.from(form.querySelectorAll(".package-content-select,.generic-content-select")).map(el=>[el.dataset.contentId||el.id,el.value])),
      additionalAccessories:Array.from(form.querySelectorAll("#additional-items-v2 .additional-item-card,#additional-accessories-list .additional-item-row")).map(row=>({type:clean(row.querySelector(".additional-item-type")?.value),manufacturer:clean(row.querySelector(".additional-item-manufacturer")?.value),model:clean(row.querySelector(".additional-item-model")?.value),quantity:Number(row.querySelector(".additional-item-quantity")?.value||1),other:clean(row.querySelector(".additional-item-other")?.value)})),
      droneSerial:equipmentStatus==="available"?clean(document.getElementById("drone-serial-number")?.value):"",
      droneSerialStatus:equipmentStatus,
      controllerSerial:controllerStatus==="available"?clean(document.getElementById("controller-serial-number")?.value):"",
      controllerSerialStatus:controllerStatus,
      legalRight:checked("legalRight"),
      valuation:"manual",
      amount:null
    };
    const automatic=getAutomaticResultFromCore();
    if(automatic){q.valuation="automatic";q.amount=automatic.amount;}
    return{itemName:q.modelName||q.categoryName||"Equipment item",...q};
  }

  function captureCurrentItem(){
    ensureState();
    const item=collectItem();
    if(!isCompleteItem(item))return null;
    let b=basket();
    const idx=window.__gcoCurrentItemIndex===null?b.length:window.__gcoCurrentItemIndex;
    if(window.__gcoCurrentItemIndex===null)b.push(item);else b[idx]=item;
    saveBasket(b);
    const input=document.getElementById("photo-uploads");
    window.__gcoMultiItemFiles[idx]=Array.from(input?.files||[]);
    window.__gcoCurrentItemIndex=idx;
    return idx;
  }

  function removeItem(index){
    let b=basket();
    if(index<0||index>=b.length)return;
    b.splice(index,1);
    saveBasket(b);
    ensureState();
    window.__gcoMultiItemFiles.splice(index,1);
    if(window.__gcoCurrentItemIndex!==null){
      if(window.__gcoCurrentItemIndex===index)window.__gcoCurrentItemIndex=null;
      else if(window.__gcoCurrentItemIndex>index)window.__gcoCurrentItemIndex--;
    }
    window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged"));
    if(typeof window.renderGearCashOutManualResult==="function")window.renderGearCashOutManualResult();
  }

  function clearAllFields(){
    try{form.reset();}catch(_){}
    ["gear-category","gear-manufacturer","dji-model","package-select"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    const manufacturer=document.getElementById("gear-manufacturer");
    if(manufacturer){manufacturer.innerHTML='<option value="">-- Select manufacturer --</option>';manufacturer.disabled=true;}
    const model=document.getElementById("dji-model");
    if(model){model.innerHTML='<option value="">-- Select a model --</option>';model.disabled=true;}
    const pkg=document.getElementById("package-select");
    if(pkg){pkg.innerHTML='<option value="">-- Select a package --</option>';pkg.disabled=true;}
    ["flight-hours","gear-usage-count","damage-description","drone-serial-number","controller-serial-number"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    const equipmentStatus=document.getElementById("equipment-serial-status");if(equipmentStatus)equipmentStatus.value="available";
    const controllerStatus=document.getElementById("controller-serial-status");if(controllerStatus)controllerStatus.value="not-applicable";
    const photo=document.getElementById("photo-uploads");if(photo)photo.value="";
    ["batteries-container","package-contents-list","additional-accessories-list","additional-items-v2"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML="";});
    form.querySelectorAll("input[type=radio],input[type=checkbox]").forEach(el=>{el.checked=false;});
    const hiddenManufacturer=form.querySelector('input[name="manufacturer"][value="dji"]');if(hiddenManufacturer)hiddenManufacturer.checked=false;
    ["damage-details","ownership-warning","unbound-warning"].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
    const usage=document.getElementById("gear-usage-count-wrap");if(usage)usage.hidden=true;
    window.__gcoCurrentItemIndex=null;
    window.dispatchEvent(new CustomEvent("gearCashOutNewItem"));
  }

  function show(n){
    if(typeof window.showStep==="function") window.showStep(n);
    else form.querySelectorAll(".wizard-step").forEach(s=>{s.hidden=Number(s.dataset.step)!==n;});
    window.setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),0);
  }

  function goToNewItem(){
    clearAllFields();
    show(1);
    const category=document.getElementById("gear-category");
    if(category)category.focus();
  }

  function resumeLiveQuote(){
    const b=basket();
    if(!b.length)return false;
    window.__gcoCurrentItemIndex=null;
    show(12);
    window.setTimeout(()=>{if(typeof window.renderGearCashOutManualResult==="function")window.renderGearCashOutManualResult();},0);
    return true;
  }

  function goToCustomerDetails(){
    try{sessionStorage.setItem("actionBuyerManualValuation","true");}catch(_){}
    show(13);
  }

  function handleClick(event){
    const button=event.target.closest("button");
    if(!button||!form.contains(button))return;
    ensureState();
    const n=currentStep();

    if(n===11&&button.classList.contains("btn-next")){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      const photo=document.getElementById("photo-uploads");
      if(!photo?.files?.length){alert("Please upload at least one photograph before continuing.");return;}
      if(captureCurrentItem()===null){alert("Please complete the item before continuing.");return;}
      show(12);
      window.setTimeout(()=>{if(typeof window.renderGearCashOutManualResult==="function")window.renderGearCashOutManualResult();},0);
      return;
    }

    if(n===12&&button.dataset.removeQuoteItem!==undefined){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      removeItem(Number(button.dataset.removeQuoteItem));
      return;
    }

    if(n===12&&button.id==="add-another-item"){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      goToNewItem();
      return;
    }

    if(n===12&&(button.id==="continue-with-quote"||button.id==="quote-result-action"||button.classList.contains("btn-accept"))){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      goToCustomerDetails();
      return;
    }
  }

  function currentStep(){const s=form.querySelector('.wizard-step:not([hidden])');return s?Number(s.dataset.step):null;}
  ensureState();
  window.gearCashOutGetMultiItemBasket=()=>basket();
  window.gearCashOutGetMultiItemFiles=()=>window.__gcoMultiItemFiles||[];
  window.gearCashOutRemoveQuoteItem=removeItem;
  window.gearCashOutResetForNewItem=goToNewItem;
  window.gearCashOutResumeLiveQuote=resumeLiveQuote;

  document.addEventListener("DOMContentLoaded",function(){
    window.setTimeout(function(){
      const path=(location.pathname||"").toLowerCase();
      if(path.endsWith("/quote.html")||path.endsWith("/quote")){
        const b=basket();
        if(b.length){
          window.setTimeout(resumeLiveQuote,150);
        }
      }
    },50);
  });
  document.addEventListener("click",handleClick,true);
})();
