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

    // Preserve the catalogue condition string exactly as rendered by the
    // catalogue itself. Only replace the old RRP/comparison prefix.
    let conditions=p.dataset.catalogConditions;
    if(!conditions){
      conditions=(p.textContent||'')
        .replace(/^\s*(?:Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)|RRP\s+[^·]+)\s*·\s*/i,'')
        .trim();
      p.dataset.catalogConditions=conditions;
    }

    const prices=rows.filter(isDirectRetail)
      .map(r=>Number(r.sell_price))
      .filter(n=>Number.isFinite(n)&&n>0);
    const unique=[...new Set(prices)].sort((a,b)=>a-b);
    const label=!unique.length
      ? 'Online comparison —'
      : unique.length===1
        ? `Online comparison ${money(unique[0])}`
        : `Online comparison ${money(unique[0])}–${money(unique[unique.length-1])}`;

    const desired=`${label} · ${conditions}`;
    if(p.dataset.onlineComparisonRendered===desired)return;
    p.innerHTML=`<span class="catalog-online-comparison-text">${escapeHtml(label)}</span> · ${escapeHtml(conditions)}`;
    p.dataset.onlineComparisonRendered=desired;
  }

  async function fetchAll(){
    const api=sb();
    if(!api)throw new Error('Supabase client unavailable');
    const out=[];
    let from=0;
    const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices')
        .select('catalog_product_id,retailer,price_type,sell_price,source_url')
        .range(from,from+pageSize-1);
      if(error)throw error;
      out.push(...(data||[]));
      if(!data||data.length<pageSize)break;
      from+=pageSize;
    }
    return out;
  }

  async function init(){
    try{
      const data=await fetchAll();
      const byProduct=new Map();
      data.forEach(row=>{
        if(!byProduct.has(row.catalog_product_id))byProduct.set(row.catalog_product_id,[]);
        byProduct.get(row.catalog_product_id).push(row);
      });

      const patch=()=>{
        const cards=document.querySelectorAll('#catalog-list .catalog-accordion-card');
        cards.forEach(card=>{
          const id=card.dataset.productId;
          if(id)setPrice(card,byProduct.get(id)||[]);
        });
        return cards.length;
      };

      // admin-catalog.js and the accordion transformer render asynchronously.
      // Do not make the catalogue wait for this enhancement and do not create
      // a mutation loop. Poll briefly for the first rendered cards, then watch
      // only child-list changes caused by filtering/refreshing the catalogue.
      let attempts=0;
      const waitForCards=()=>{
        const count=patch();
        if(count||attempts++>=20){
          const list=document.getElementById('catalog-list');
          if(list&&!list.dataset.onlineComparisonWired){
            list.dataset.onlineComparisonWired='1';
            new MutationObserver(()=>patch()).observe(list,{childList:true,subtree:true});
          }
          return;
        }
        setTimeout(waitForCards,250);
      };
      waitForCards();
    }catch(e){
      console.error('Online comparison enhancement failed',e);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
