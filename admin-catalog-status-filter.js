/* GearCashOut catalogue status filter.
   UI-only filtering: this module never writes to quote_catalog_products and does not alter the quote engine. */
(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', function(){
    const filter=document.getElementById('status-filter');
    if(!filter || typeof window.renderList!=='function') return;

    const originalRenderList=window.renderList;
    window.renderList=function(){
      const selected=filter.value;
      if(!selected){
        originalRenderList();
        return;
      }
      const previous=window.products;
      if(!Array.isArray(previous)){
        originalRenderList();
        return;
      }
      window.products=previous.filter(p=>selected==='active' ? p.active===true : p.active===false);
      try{ originalRenderList(); } finally { window.products=previous; }
    };

    filter.addEventListener('change', function(){ window.renderList(); });
  });
})();
