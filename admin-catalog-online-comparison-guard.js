/* GearCashOut: hard guard for the catalogue headline. Only explicit UK + GBP evidence can affect Online comparison. */
(function(){
  'use strict';
  const qualifyingTypes=new Set(['new','new_sale','market']);
  const excludedSource=/eBay\.|Vinted\.|Facebook\.|Gumtree\.|Etsy\.|Depop\.|Shpock\.|auction|marketplace|reseller|classified|pricespy\.|idealo\.|supersales\.|onbuy\.|pricerunner\.|kelkoo\.|shopzilla\.|shopping\.google\.|shop\.autelrobotics\.com/i;
  const excludedRetailer=/amazon\s+marketplace|marketplace|reseller|comparison|pricespy|supersales|onbuy|pricerunner|research\s+audit/i;
  const cache=new Map();
  let wired=false;
  const money=v=>`£${Number(v).toFixed(2)}`;
  function eligible(row){
    if(!row||row.sell_price==null)return false;
    const type=String(row.price_type||'').trim().toLowerCase();
    if(!qualifyingTypes.has(type))return false;
    if(String(row.price_currency||'').trim().toUpperCase()!=='GBP')return false;
    if(String(row.evidence_region||'').trim().toUpperCase()!=='UK')return false;
    if(excludedSource.test(`${row.retailer||''} ${row.source_url||''}`))return false;
    if(excludedRetailer.test(String(row.retailer||'')))return false;
    if(!/^https?:\/\//i.test(String(row.source_url||'')))return false;
    const notes=String(row.notes||'');
    if(/\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded/i.test(notes))return false;
    const condition=String(row.condition||'').trim();
    if(type==='market'&&!/^(new|new\s*[-–]?\s*sale|new\s*\/\s*never\s*used)$/i.test(condition))return false;
    const availability=String(row.availability_status||'').trim().toLowerCase();
    if(availability==='out_of_stock'&&/\bdiscontinued\b/i.test(notes))return false;
    if(availability&&!['in_stock','out_of_stock','unknown'].includes(availability))return false;
    return true;
  }
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function getCardId(card){return card?.dataset?.productId||card?.querySelector('.edit-product')?.dataset?.id||'';}
  function getTitle(card){return card.querySelector('.catalog-accordion-title')||card.querySelector('.valuation-card > div:first-child');}
  function renderCard(card){
    const id=getCardId(card);if(!id)return;
    const title=getTitle(card);const p=title?.querySelector('p');if(!p)return;
    let conditions=p.dataset.catalogConditions;
    if(!conditions){
      conditions=(p.textContent||'').replace(/^\s*(?:Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)|RRP\s+[^·]+)\s*·\s*/i,'').trim();
      p.dataset.catalogConditions=conditions;
    }
    const values=[...new Set(cache.get(id)||[])].sort((a,b)=>a-b);
    const label=values.length===0?'Online comparison —':values.length===1?`Online comparison ${money(values[0])}`:`Online comparison ${money(values[0])}–${money(values[values.length-1])}`;
    const desired=`${label} · ${conditions}`;
    if(p.dataset.gcoUkGuardRendered!==desired){
      p.innerHTML=`<span class="catalog-online-comparison-text">${esc(label)}</span> · ${esc(conditions)}`;
      p.dataset.gcoUkGuardRendered=desired;
      p.dataset.onlineComparisonRendered=desired;
    }
  }
  function renderAll(){document.querySelectorAll('#catalog-list .valuation-card').forEach(renderCard);}
  async function load(){
    const api=window.actionBuyerAuth?.supabase;if(!api)return;
    const next=new Map();let from=0;const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices').select('catalog_product_id,retailer,price_type,condition,sell_price,availability_status,source_url,notes,price_currency,evidence_region').in('price_type',['new','new_sale','market']).range(from,from+pageSize-1);
      if(error){console.error('UK comparison guard lookup failed',error);return;}
      (data||[]).forEach(row=>{
        if(!eligible(row))return;
        const price=Number(row.sell_price);if(!Number.isFinite(price)||price<=0||!row.catalog_product_id)return;
        if(!next.has(row.catalog_product_id))next.set(row.catalog_product_id,[]);
        next.get(row.catalog_product_id).push(price);
      });
      if(!data||data.length<pageSize)break;from+=pageSize;
    }
    cache.clear();next.forEach((v,k)=>cache.set(k,v));renderAll();
  }
  function wire(){
    const list=document.getElementById('catalog-list');if(!list||wired)return;wired=true;
    new MutationObserver(()=>renderAll()).observe(list,{childList:true,subtree:true});
    renderAll();load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
