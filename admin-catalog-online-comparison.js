/* GearCashOut: direct UK online retail comparison prices in catalogue title bars. */
(function(){
  'use strict';

  const sb=()=>window.actionBuyerAuth?.supabase;
  const money=v=>`£${Number(v).toFixed(2)}`;
  const excluded=/eBay|Vinted|Facebook\s*Marketplace|Gumtree|Etsy|Depop|Shpock|auction|marketplace|person[-\s]?to[-\s]?person|reseller|classified/i;
  const qualifyingTypes=new Set(['new','new_sale']);

  function isDirectRetail(row){
    if(!row||row.sell_price==null||!Number.isFinite(Number(row.sell_price)))return false;
    if(!qualifyingTypes.has(String(row.price_type||'').toLowerCase()))return false;
    return !excluded.test(`${row.retailer||''} ${row.source_url||''}`);
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setPrice(card,rows){
    const title=card.querySelector('.catalog-accordion-title');
    const p=title?.querySelector('p');
    if(!p)return;

    // Keep the existing Sealed / Unused / Excellent / Good / Fair line intact,
    // while replacing any previous comparison prefix with the current value.
    const conditions=(p.dataset.catalogConditions||p.textContent||'')
      .replace(/^\s*Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)\s*·\s*/i,'')
      .replace(/^\s*RRP\s+[^·]+\s*·\s*/i,'')
      .trim();
    p.dataset.catalogConditions=conditions;

    const prices=rows.filter(isDirectRetail)
      .map(r=>Number(r.sell_price))
      .filter(Number.isFinite);
    const unique=[...new Set(prices)].sort((a,b)=>a-b);
    const label=!unique.length
      ? 'Online comparison —'
      : unique.length===1
        ? `Online comparison ${money(unique[0])}`
        : `Online comparison ${money(unique[0])}–${money(unique[unique.length-1])}`;

    p.innerHTML=`<span class="catalog-online-comparison-text">${escapeHtml(label)}</span> · ${escapeHtml(conditions)}`;
  }

  async function load(){
    const api=sb();if(!api)return;
    const {data,error}=await api.from('quote_catalog_retailer_prices')
      .select('catalog_product_id,retailer,price_type,sell_price,source_url');
    if(error){console.error('Online comparison price load failed',error);return;}

    const byProduct=new Map();
    (data||[]).forEach(row=>{
      if(!byProduct.has(row.catalog_product_id))byProduct.set(row.catalog_product_id,[]);
      byProduct.get(row.catalog_product_id).push(row);
    });

    function patch(){
      document.querySelectorAll('#catalog-list .catalog-accordion-card').forEach(card=>{
        const id=card.dataset.productId;
        if(id)setPrice(card,byProduct.get(id)||[]);
      });
    }

    patch();
    const list=document.getElementById('catalog-list');
    if(list&&!list.dataset.onlineComparisonWired){
      list.dataset.onlineComparisonWired='1';
      new MutationObserver(patch).observe(list,{childList:true,subtree:true});
    }
  }

  function init(){load().catch(e=>console.error('Online comparison enhancement failed',e));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
