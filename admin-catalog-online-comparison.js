/* GearCashOut: render the actual direct-retailer Online Comparison value in each catalogue product bar. */
(function(){
  'use strict';

  const money=v=>`£${Number(v).toFixed(2)}`;
  const excluded=/eBay|Vinted|Facebook\s*Marketplace|Gumtree|Etsy|Depop|Shpock|auction|marketplace|person[-\s]?to[-\s]?person|reseller|classified/i;
  const qualifyingTypes=new Set(['new','new_sale']);
  const cache=new Map();
  let wired=false;

  function isDirectRetail(row){
    if(!row||row.sell_price==null)return false;
    if(!qualifyingTypes.has(String(row.price_type||'').toLowerCase()))return false;
    if(excluded.test(`${row.retailer||''} ${row.source_url||''}`))return false;
    const notes=String(row.notes||'');
    if(/\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded/i.test(notes))return false;
    return true;
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function getTitle(card){return card.querySelector('.catalog-accordion-title')||card.querySelector('.valuation-card > div:first-child');}

  function setPrice(card){
    const id=card?.dataset?.productId||card?.querySelector('.edit-product')?.dataset?.id;
    if(!id)return;
    const title=getTitle(card); if(!title)return;
    const p=title.querySelector('p'); if(!p)return;

    const existing=p.dataset.catalogConditions;
    let conditions=existing;
    if(!conditions){
      conditions=(p.textContent||'')
        .replace(/^\s*(?:Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)|RRP\s+[^·]+)\s*·\s*/i,'')
        .trim();
      p.dataset.catalogConditions=conditions;
    }

    const prices=cache.get(id)||[];
    const unique=[...new Set(prices)].sort((a,b)=>a-b);
    const label=!unique.length?'Online comparison —':unique.length===1?`Online comparison ${money(unique[0])}`:`Online comparison ${money(unique[0])}–${money(unique[unique.length-1])}`;
    const desired=`${label} · ${conditions}`;
    if(p.dataset.onlineComparisonRendered===desired)return;
    p.innerHTML=`<span class="catalog-online-comparison-text">${esc(label)}</span> · ${esc(conditions)}`;
    p.dataset.onlineComparisonRendered=desired;
  }

  function renderAll(){document.querySelectorAll('#catalog-list .valuation-card').forEach(setPrice);}

  async function fetchPrices(){
    const api=window.actionBuyerAuth?.supabase;
    if(!api)return;
    const next=new Map();
    let from=0;
    const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices')
        .select('catalog_product_id,retailer,price_type,sell_price,source_url,notes')
        .in('price_type',['new','new_sale'])
        .range(from,from+pageSize-1);
      if(error){console.error('Online comparison price lookup failed',error);return;}
      (data||[]).forEach(row=>{
        if(!isDirectRetail(row))return;
        const price=Number(row.sell_price);
        if(!Number.isFinite(price)||price<=0||!row.catalog_product_id)return;
        if(!next.has(row.catalog_product_id))next.set(row.catalog_product_id,[]);
        next.get(row.catalog_product_id).push(price);
      });
      if(!data||data.length<pageSize)break;
      from+=pageSize;
    }
    cache.clear();next.forEach((v,k)=>cache.set(k,v));
    renderAll();
  }

  function wire(){
    const list=document.getElementById('catalog-list');
    if(!list||wired)return;
    wired=true;
    const observer=new MutationObserver(()=>renderAll());
    observer.observe(list,{childList:true,subtree:true});
    renderAll();
    fetchPrices();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
