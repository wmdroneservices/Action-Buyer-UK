/* Defensive bootstrap for the staff catalogue. If the primary catalogue script did not start, retry it after auth/DOM are ready. */
(function(){
  'use strict';
  function loadFreshComparison(){
    if(document.querySelector('script[data-gco-uk-comparison-v18]'))return;
    const s=document.createElement('script');
    s.src='admin-catalog-online-comparison.js?v=20260901-18';
    s.defer=true;
    s.dataset.gcoUkComparisonV18='1';
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
    loadFreshComparison();
    setTimeout(retry,500);
    setTimeout(retry,1500);
    setTimeout(retry,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();