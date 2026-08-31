/* GearCashOut: show a clear Online comparison discontinued label for products whose research confirms no current new UK price. */
(function(){
  'use strict';
  const discontinued=new Set();
  let wired=false;
  function getProductId(card){return card?.dataset?.productId||card?.querySelector('.edit-product')?.dataset?.id;}
  function render(card){
    const id=getProductId(card); if(!id||!discontinued.has(id))return;
    const title=card.querySelector('.catalog-accordion-title')||card.querySelector('.valuation-card > div:first-child');
    const p=title?.querySelector('p'); if(!p)return;
    const span=p.querySelector('.catalog-online-comparison-text');
    if(span){span.textContent='Online comparison discontinued';return;}
    const text=p.textContent||'';
    const replaced=text.replace(/^\s*Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)\s*·\s*/i,'Online comparison discontinued · ');
    if(replaced!==text)p.textContent=replaced;
  }
  function renderAll(){document.querySelectorAll('#catalog-list .valuation-card').forEach(render);}
  async function load(){
    const api=window.actionBuyerAuth?.supabase;if(!api)return;
    const {data,error}=await api.from('quote_catalog_products').select('id,notes').eq('manufacturer','DJI');
    if(error){console.error('Discontinued catalogue label lookup failed',error);return;}
    (data||[]).forEach(row=>{if(/Online comparison:\s*DISCONTINUED/i.test(String(row.notes||'')))discontinued.add(row.id);});
    renderAll();
  }
  function wire(){
    const list=document.getElementById('catalog-list');if(!list||wired)return;
    wired=true;new MutationObserver(renderAll).observe(list,{childList:true,subtree:true});load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
