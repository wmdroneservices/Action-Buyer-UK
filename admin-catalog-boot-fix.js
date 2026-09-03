/* Catalogue bootstrap: load the single authoritative market-structure renderer after auth/DOM are ready. */
(function(){
  'use strict';
  function loadEvidenceTools(){
    if(document.querySelector('script[data-gco-evidence-tools="1"]'))return;
    const s=document.createElement('script');
    s.src='admin-catalog-evidence-tools.js?v=20260901-1';
    s.defer=true;
    s.dataset.gcoEvidenceTools='1';
    document.head.appendChild(s);
  }
  function loadMarketStructure(){
    if(document.querySelector('script[data-gco-market-structure="1"]')){loadEvidenceTools();return;}
    const s=document.createElement('script');
    s.src='admin-catalog-market-structure.js?v=20260901-1';
    s.defer=true;
    s.dataset.gcoMarketStructure='1';
    s.onload=loadEvidenceTools;
    document.head.appendChild(s);
  }
  function retry(){
    const list=document.getElementById('catalog-list');
    if(!list||!window.actionBuyerAuth)return;
    const run=typeof window.load==='function'?window.load:null;
    if(!run)return;
    const text=(list.textContent||'').trim();
    if(text==='Loading...'||!list.children.length){
      try{run();}catch(e){console.error('Catalogue bootstrap retry failed',e);}
    }
  }
  function init(){
    loadMarketStructure();
    setTimeout(loadEvidenceTools,1000);
    setTimeout(loadEvidenceTools,2500);
    setTimeout(retry,500);
    setTimeout(retry,1500);
    setTimeout(retry,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
