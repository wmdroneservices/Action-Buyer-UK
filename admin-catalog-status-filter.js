/* GearCashOut catalogue status filter + automatic online comparison fallback.
   UI-only filtering and market-reference display: this module never writes to
   quote_catalog_products or changes GearCashOut buying prices. */
(function(){
  'use strict';

  const money=value=>Number(value).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const comparisonCache=new Map();
  let timer=null;

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

  function productId(card){
    return card?.dataset?.productId ||
      card?.querySelector('.edit-product')?.dataset?.id ||
      card?.querySelector('.catalog-title-status')?.dataset?.id ||
      card?.querySelector('.catalog-inline-edit')?.dataset?.id || '';
  }

  async function loadAllComparisons(){
    const supabase=window.actionBuyerAuth?.supabase;
    if(!supabase)return;

    const byProduct=new Map();
    let from=0;
    const pageSize=1000;

    while(true){
      const {data,error}=await supabase
        .from('quote_catalog_retailer_prices')
        .select('catalog_product_id,sell_price,availability_status,notes,price_type')
        .in('price_type',['new','new_sale'])
        .range(from,from+pageSize-1);

      if(error){
        console.error('Online comparison price lookup failed',error);
        return;
      }

      (data||[]).forEach(row=>{
        if(row.sell_price==null||!isConsumerPrice(row))return;
        if(!['in_stock','unknown'].includes(String(row.availability_status||'').toLowerCase()))return;
        const price=Number(row.sell_price);
        if(!Number.isFinite(price)||!row.catalog_product_id)return;
        if(!byProduct.has(row.catalog_product_id))byProduct.set(row.catalog_product_id,[]);
        byProduct.get(row.catalog_product_id).push(price);
      });

      if(!data||data.length<pageSize)break;
      from+=pageSize;
    }

    byProduct.forEach((prices,id)=>{
      const sorted=[...new Set(prices)].sort((a,b)=>a-b);
      comparisonCache.set(id,sorted.length===1?money(sorted[0]):`${money(sorted[0])}–${money(sorted[sorted.length-1])}`);
    });

    processCatalogue();
  }

  function renderComparison(card){
    const id=productId(card);
    const comparison=id?comparisonCache.get(id):null;
    if(!id||!comparison)return;
    card.dataset.onlineComparison=comparison;

    const title=card.querySelector('.catalog-accordion-title p') ||
      card.querySelector('.valuation-card > div:first-child p');
    if(title&&/^RRP\s+—/i.test(title.textContent.trim())){
      const text=title.textContent;
      const marker=' · Sealed ';
      const suffix=text.includes(marker)?text.slice(text.indexOf(marker)):'';
      const next=`Online comparison ${comparison}${suffix}`;
      if(title.textContent!==next)title.textContent=next;
    }

    const summary=card.querySelector('.catalog-accordion-summary');
    if(summary){
      let stat=summary.querySelector('.online-comparison-stat');
      if(!stat){
        stat=document.createElement('div');
        stat.className='catalog-accordion-stat online-comparison-stat';
        summary.appendChild(stat);
      }
      stat.innerHTML=`<strong>${comparison}</strong><span>Online comparison</span>`;
    }
  }

  function processCatalogue(){
    const list=document.getElementById('catalog-list');
    if(!list)return;
    list.querySelectorAll('.valuation-card').forEach(renderComparison);
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(processCatalogue,300);
  }

  function wire(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter||!list)return;
    if(list.dataset.statusFilterWired!=='1'){
      list.dataset.statusFilterWired='1';
      filter.addEventListener('change',applyStatusFilter);
      const observer=new MutationObserver(mutations=>{
        const structural=mutations.some(m=>Array.from(m.addedNodes).some(node=>node.nodeType===1 && !node.classList.contains('online-comparison-stat')));
        if(structural){applyStatusFilter();schedule();}
      });
      observer.observe(list,{childList:true,subtree:true});
    }
    applyStatusFilter();
    schedule();
    setTimeout(schedule,1000);
    setTimeout(schedule,2500);
    loadAllComparisons();
  }

  document.addEventListener('DOMContentLoaded',wire);
})();