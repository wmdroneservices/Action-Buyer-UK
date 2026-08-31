/* GearCashOut catalogue status filter + online comparison fallback.
   UI-only filtering and market-reference display: this module never writes to
   quote_catalog_products or changes GearCashOut buying prices. */
(function(){
  'use strict';

  const money=value=>Number(value).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const comparisonCache=new Map();
  let comparisonTimer=null;
  let observer=null;

  const isConsumerPrice=row=>{
    const notes=String(row?.notes||'');
    if(/\binc\.?\s*vat\b|including\s+vat|vat\s+included/i.test(notes))return true;
    return !(/\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded/i.test(notes));
  };

  function applyStatusFilter(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter||!list)return;
    const selected=filter.value;
    const cards=list.querySelectorAll('.valuation-card');
    cards.forEach(card=>{
      const badge=card.querySelector('.status-badge');
      const titleStatus=card.querySelector('.catalog-title-status');
      const status=(badge?.textContent||titleStatus?.textContent||'').trim().toLowerCase();
      card.style.display=(!selected||status===selected)?'':'none';
    });
    const visible=Array.from(cards).some(card=>card.style.display!=='none');
    let empty=list.querySelector('.status-filter-empty');
    if(selected&&cards.length&&!visible){
      if(!empty){empty=document.createElement('div');empty.className='empty-account status-filter-empty';list.appendChild(empty);}
      empty.innerHTML=`<h3>No ${selected} products found</h3><p>Change the Status filter or choose All products.</p>`;
      empty.style.display='';
    }else if(empty)empty.style.display='none';
  }

  async function loadComparisonsForCards(cards){
    const supabase=window.actionBuyerAuth?.supabase;
    if(!supabase||!cards.length)return;

    const ids=[...new Set(cards.map(card=>card.dataset.productId).filter(id=>id&&!comparisonCache.has(id)))];
    if(!ids.length)return;

    const {data,error}=await supabase
      .from('quote_catalog_retailer_prices')
      .select('catalog_product_id,sell_price,availability_status,notes,price_type')
      .in('catalog_product_id',ids)
      .in('price_type',['new','new_sale']);

    if(error){
      console.error('Online comparison price lookup failed',error);
      return;
    }

    const byProduct=new Map();
    (data||[]).forEach(row=>{
      if(row.sell_price==null||!isConsumerPrice(row))return;
      if(!['in_stock','unknown'].includes(String(row.availability_status||'').toLowerCase()))return;
      const price=Number(row.sell_price);
      if(!Number.isFinite(price))return;
      if(!byProduct.has(row.catalog_product_id))byProduct.set(row.catalog_product_id,[]);
      byProduct.get(row.catalog_product_id).push(price);
    });

    ids.forEach(id=>{
      const prices=(byProduct.get(id)||[]).sort((a,b)=>a-b);
      const comparison=prices.length===1
        ?money(prices[0])
        :prices.length>1
          ?`${money(prices[0])}–${money(prices[prices.length-1])}`
          :null;
      /* Cache null as well so products with no qualifying evidence do not
         cause a database request every time the catalogue mutates. */
      comparisonCache.set(id,comparison);
    });
  }

  function renderComparison(card){
    const id=card?.dataset?.productId;
    const comparison=id?comparisonCache.get(id):null;
    if(!id||!comparison)return;

    /* Always show the market-reference value in the expanded summary. */
    const panel=card.querySelector('.catalog-accordion-panel');
    const summary=panel?.querySelector('.catalog-accordion-summary');
    if(summary){
      let stat=summary.querySelector('.online-comparison-stat');
      if(!stat){
        stat=document.createElement('div');
        stat.className='catalog-accordion-stat online-comparison-stat';
        summary.appendChild(stat);
      }
      stat.innerHTML=`<strong>${comparison}</strong><span>Online comparison</span>`;
    }

    /* If there is no manufacturer RRP, replace the visible RRP placeholder
       with the online comparison. A real manufacturer RRP is never changed. */
    const title=card.querySelector('.catalog-accordion-title p');
    if(title&&/^RRP\s+—/i.test(title.textContent.trim())){
      const text=title.textContent;
      const marker=' · Sealed ';
      const suffix=text.includes(marker)?text.slice(text.indexOf(marker)):'';
      title.textContent=`Online comparison ${comparison}${suffix}`;
    }
  }

  async function processCatalogue(){
    const list=document.getElementById('catalog-list');
    if(!list)return;

    const cards=Array.from(list.querySelectorAll('.catalog-accordion-card'));
    if(!cards.length)return;

    await loadComparisonsForCards(cards);

    /* Render every card that already has its accordion panel, without the
       user having to click it. Newly rendered/opened panels are handled by
       the MutationObserver below. */
    cards.forEach(renderComparison);
  }

  function scheduleProcess(){
    clearTimeout(comparisonTimer);
    comparisonTimer=setTimeout(processCatalogue,250);
  }

  function wire(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter||!list||list.dataset.statusFilterWired==='1')return;
    list.dataset.statusFilterWired='1';

    filter.addEventListener('change',applyStatusFilter);
    applyStatusFilter();
    scheduleProcess();

    /* The catalogue is rendered/re-rendered dynamically. Watch the whole
       catalogue so every newly inserted product is automatically processed,
       and so an accordion opening gets its online comparison immediately. */
    observer=new MutationObserver(()=>{
      applyStatusFilter();
      scheduleProcess();
    });
    observer.observe(list,{childList:true,subtree:true});
  }

  document.addEventListener('DOMContentLoaded',wire);
})();