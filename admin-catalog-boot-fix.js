/* Catalogue bootstrap: load the single authoritative market-structure renderer after auth/DOM are ready. */
(function(){
  'use strict';
  function loadMarketStructure(){
    if(document.querySelector('script[data-gco-market-structure="1"]'))return;
    const s=document.createElement('script');
    s.src='admin-catalog-market-structure.js?v=20260901-1';
    s.defer=true;
    s.dataset.gcoMarketStructure='1';
    document.head.appendChild(s);
  }
  function retry(){
    const list=document.getElementById('catalog-list');
    if(!list||!window.actionBuyerAuth||typeof window.load!=='function')return;
    const text=(list.textContent||'').trim();
    if(text==='Loading...'||!list.children.length){
      try{window.load();}catch(e){console.error('Catalogue bootstrap retry failed',e);}
    }
  }
  function init(){
    loadMarketStructure();
    setTimeout(retry,500);
    setTimeout(retry,1500);
    setTimeout(retry,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
