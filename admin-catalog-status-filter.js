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
      const titleStatus=card.querySelector('.catalog-title-status');
      const status=(badge?.textContent||titleStatus?.textContent||'').trim().toLowerCase();
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

  const money=value=>Number(value).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const isConsumerPrice=row=>{
    const notes=String(row?.notes||'').toLowerCase();
    return !/(\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded)/i.test(notes);
  };

  let comparisonTimer=null;
  let lastListFirstCard=null;

  async function updateOnlineComparisons(){
    const list=document.getElementById('catalog-list');
    const supabase=window.actionBuyerAuth?.supabase;
    if(!list || !supabase) return;
    const cards=Array.from(list.querySelectorAll('.catalog-accordion-card'));
    const firstCard=cards[0]||null;
    if(!cards.length || firstCard===lastListFirstCard) return;
    lastListFirstCard=firstCard;

    const ids=cards.map(card=>card.dataset.productId).filter(Boolean);
    const productMeta=new Map();
    cards.forEach(card=>{
      const id=card.dataset.productId;
      const title=card.querySelector('.catalog-accordion-title p');
      if(id && title) productMeta.set(id,{card,title,hasRrp:!/^RRP\s+—/i.test(title.textContent.trim())});
    });
    if(!productMeta.size) return;

    const rows=[];
    const pageSize=1000;
    for(let from=0;;from+=pageSize){
      const {data,error}=await supabase
        .from('quote_catalog_retailer_prices')
        .select('catalog_product_id,price_type,sell_price,availability_status,notes')
        .in('catalog_product_id',ids)
        .in('price_type',['new','new_sale'])
        .range(from,from+pageSize-1);
      if(error){console.error('Online comparison prices failed to load',error);return;}
      rows.push(...(data||[]));
      if(!data || data.length<pageSize) break;
    }

    const byProduct=new Map();
    rows.filter(r=>r.sell_price!=null && isConsumerPrice(r) && ['in_stock','unknown'].includes(String(r.availability_status||'').toLowerCase()))
      .forEach(r=>{
        const price=Number(r.sell_price);if(!Number.isFinite(price))return;
        if(!byProduct.has(r.catalog_product_id))byProduct.set(r.catalog_product_id,[]);
        byProduct.get(r.catalog_product_id).push(price);
      });

    productMeta.forEach(({title,hasRrp},id)=>{
      const prices=[...(byProduct.get(id)||[])].sort((a,b)=>a-b);
      const comparison=prices.length===1?money(prices[0]):prices.length>1?`${money(prices[0])}–${money(prices[prices.length-1])}`:null;
      if(!comparison || hasRrp) return;
      const text=title.textContent;
      const marker=' · Sealed ';
      const suffix=text.includes(marker)?text.slice(text.indexOf(marker)):'';
      title.textContent=`Online comparison ${comparison}${suffix}`;
    });
  }

  function scheduleComparisonUpdate(){
    clearTimeout(comparisonTimer);
    comparisonTimer=setTimeout(updateOnlineComparisons,150);
  }

  document.addEventListener('DOMContentLoaded',function(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter || !list) return;
    filter.addEventListener('change',applyStatusFilter);
    const observer=new MutationObserver(()=>{applyStatusFilter();scheduleComparisonUpdate();});
    observer.observe(list,{childList:true,subtree:true});
    applyStatusFilter();
    scheduleComparisonUpdate();
  });
})();
