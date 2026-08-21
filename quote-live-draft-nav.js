/* Keep an unfinished multi-item valuation reachable from the site-wide navigation. */
(function(){
  "use strict";
  const BASKET_KEY="gearCashOutQuoteBasket";
  const SUBMITTED_KEY="gearCashOutQuoteSubmitted";
  const LINK_ID="live-quote-nav-link";

  function getBasket(){
    try{
      const b=JSON.parse(localStorage.getItem(BASKET_KEY)||"[]");
      return Array.isArray(b)?b:[];
    }catch(_){return[];}
  }

  function isLive(){
    if(localStorage.getItem(SUBMITTED_KEY)==="true")return false;
    return getBasket().length>0;
  }

  function updateLink(){
    document.querySelectorAll("#"+LINK_ID).forEach(function(link){
      const live=isLive();
      const count=getBasket().length;
      link.hidden=!live;
      link.textContent=live?(count>1?"Your Quote ("+count+")":"Your Quote"):"Your Quote";
    });
  }

  function ensureLink(){
    document.querySelectorAll(".nav-list").forEach(function(nav){
      let link=document.getElementById(LINK_ID);
      if(!link||!nav.contains(link)){
        const li=document.createElement("li");
        link=document.createElement("a");
        link.id=LINK_ID;
        link.href="quote.html#live-quote";
        link.hidden=true;
        link.textContent="Your Quote";
        li.appendChild(link);
        const account=nav.querySelector("[data-account-link]")?.closest("li");
        if(account)nav.insertBefore(li,account);else nav.appendChild(li);
      }
      link.addEventListener("click",function(event){
        if(!isLive())return;
        if(!/quote\.html$/i.test(location.pathname))return;
        event.preventDefault();
        const form=document.getElementById("quote-form");
        if(!form)return;
        const show=window.showStep;
        if(typeof show==="function")show(12);
        setTimeout(function(){
          if(typeof window.renderGearCashOutManualResult==="function")window.renderGearCashOutManualResult();
        },50);
      });
    });
    updateLink();
  }

  function clearSubmittedDraft(){
    const form=document.getElementById("quote-form");
    if(!form)return;
    const visible=form.querySelector('.wizard-step:not([hidden])');
    if(visible&&Number(visible.dataset.step)===14){
      try{
        localStorage.removeItem(BASKET_KEY);
        localStorage.setItem(SUBMITTED_KEY,"true");
      }catch(_){}
      updateLink();
    }
  }

  document.addEventListener("DOMContentLoaded",function(){
    try{
      if(getBasket().length===0)localStorage.removeItem(SUBMITTED_KEY);
    }catch(_){}
    ensureLink();
    const form=document.getElementById("quote-form");
    if(form){
      const observer=new MutationObserver(function(){clearSubmittedDraft();});
      observer.observe(form,{subtree:true,attributes:true,attributeFilter:["hidden"]});
    }
    window.addEventListener("storage",updateLink);
    window.addEventListener("gearCashOutBasketChanged",updateLink);
    setTimeout(updateLink,250);
    setTimeout(updateLink,1000);
  });
})();
