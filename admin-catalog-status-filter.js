/* GearCashOut catalogue status filter.
   UI-only filtering: this module never writes to quote_catalog_products and does not alter the quote engine.
   It filters the already-rendered catalogue cards, so the existing catalogue logic remains untouched. */
(function(){
  'use strict';

  function applyStatusFilter(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter || !list) return;
    const selected=filter.value;
    const cards=list.querySelectorAll('.valuation-card');
    cards.forEach(card=>{
      const badge=card.querySelector('.status-badge');
      const status=(badge?.textContent||'').trim().toLowerCase();
      card.style.display=(!selected || status===selected)?'':'none';
    });
    const visible=Array.from(cards).some(card=>card.style.display!=='none');
    let empty=list.querySelector('.status-filter-empty');
    if(selected && cards.length && !visible){
      if(!empty){
        empty=document.createElement('div');
        empty.className='empty-account status-filter-empty';
        list.appendChild(empty);
      }
      empty.innerHTML=`<h3>No ${selected} products found</h3><p>Change the Status filter or choose All products.</p>`;
      empty.style.display='';
    }else if(empty){
      empty.style.display='none';
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter || !list) return;
    filter.addEventListener('change',applyStatusFilter);
    const observer=new MutationObserver(applyStatusFilter);
    observer.observe(list,{childList:true,subtree:true});
    applyStatusFilter();
  });
})();
