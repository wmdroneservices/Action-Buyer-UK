/* GearCashOut: historical UK Online Comparison values. Foreign currencies/regions are never eligible. */
(function(){
  'use strict';
  const excludedSource=/eBay\.|Vinted\.|Facebook\.|Gumtree\.|Etsy\.|Depop\.|Shpock\.|auction|marketplace|reseller|classified|pricespy\.|idealo\.|supersales\.|onbuy\.|pricerunner\.|kelkoo\.|shopzilla\.|shopping\.google\./i;
  const excludedRetailer=/amazon\s+marketplace|marketplace|reseller|comparison|pricespy|supersales|onbuy|pricerunner|research\s+audit/i;
  const types=new Set(['new','new_sale','market']);
  const cache=new Map();
  let wired=false;
  const money=v=>`£${Number(v).toFixed(2)}`;
  function valid(row){
    if(!row||row.sell_price==null||!types.has(String(row.price_type||'').toLowerCase()))return false;
    const currency=String(row.price_currency||'').trim().toUpperCase();
    const region=String(row.evidence_region||'').trim().toUpperCase();
    if(currency!=='GBP'||region!=='UK')return false;
    if(excludedSource.test(`${row.retailer||''} ${row.source_url||''}`)||excludedRetailer.test(String(row.retailer||'')))return false;
    if(!/^https?:\/\//i.test(String(row.source_url||'')))return false;
    if(/\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded/i.test(String(row.notes||'')))return false;
    if(/\$|\bUSD\b|\bEUR\b|€|\bUS\b|\bEU\b/i.test(String(row.notes||'')))return false;
    const condition=String(row.condition||'').trim();
    if(String(row.price_type||'').toLowerCase()==='market'&&!/^(new|new\s*[-–]?\s*sale|new\s*\/\s*never\s*used)$/i.test(condition))return false;
    const availability=String(row.availability_status||'').toLowerCase();
    if(availability==='out_of_stock'){if(/\bdiscontinued\b/i.test(String(row.notes||'')))return false;}else if(!['in_stock','unknown'].includes(availability))return false;
    return true;
  }
  function id(card){return card?.dataset?.productId||card?.querySelector('.edit-product')?.dataset?.id;}
  function render(card){
    const pid=id(card);if(!pid)return;
    const title=card.querySelector('.catalog-accordion-title')||card.querySelector('.valuation-card > div:first-child');
    const p=title?.querySelector('p');if(!p)return;
    const prices=cache.get(pid)||[];const unique=[...new Set(prices)].sort((a,b)=>a-b);
    const label=!unique.length?'Online comparison —':unique.length===1?`Online comparison ${money(unique[0])}`:`Online comparison ${money(unique[0])}–${money(unique[unique.length-1])}`;
    const conditions=(p.dataset.catalogConditions||(p.textContent||'').replace(/^\s*(?:Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)|RRP\s+[^·]+)\s*·\s*/i,'').trim());
    p.dataset.catalogConditions=conditions;
    p.innerHTML=`<span class="catalog-online-comparison-text">${label}</span> · ${conditions}`;
  }
  function renderAll(){document.querySelectorAll('#catalog-list .valuation-card').forEach(render);}
  async function load(){
    const api=window.actionBuyerAuth?.supabase;if(!api)return;
    const next=new Map();let from=0;const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices').select('catalog_product_id,retailer,price_type,condition,sell_price,availability_status,source_url,notes,price_currency,evidence_region').in('price_type',['new','new_sale','market']).range(from,from+pageSize-1);
      if(error){console.error('Historical online comparison lookup failed',error);return;}
      (data||[]).forEach(row=>{if(!valid(row))return;const price=Number(row.sell_price);if(!Number.isFinite(price)||price<=0||!row.catalog_product_id)return;if(!next.has(row.catalog_product_id))next.set(row.catalog_product_id,[]);next.get(row.catalog_product_id).push(price);});
      if(!data||data.length<pageSize)break;from+=pageSize;
    }
    cache.clear();next.forEach((v,k)=>cache.set(k,v));renderAll();
  }
  window.addEventListener('gco:evidence-saved',()=>{load();});
  function wire(){const list=document.getElementById('catalog-list');if(!list||wired)return;wired=true;new MutationObserver(renderAll).observe(list,{childList:true,subtree:true});load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
