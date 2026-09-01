/* Defensive bootstrap for the staff catalogue. The UK GBP guard is loaded after the catalogue scripts so no stale comparison routine can reintroduce foreign prices. */
(function(){
  'use strict';
  function loadUkGuard(){
    if(document.querySelector('script[data-gco-uk-comparison-guard]'))return;
    const s=document.createElement('script');
    s.src='admin-catalog-online-comparison-guard.js?v=20260901-1';
    s.defer=true;
    s.dataset.gcoUkComparisonGuard='1';
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
    loadUkGuard();
    setTimeout(retry,500);
    setTimeout(retry,1500);
    setTimeout(retry,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
