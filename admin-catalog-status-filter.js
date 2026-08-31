/* GearCashOut catalogue status filter + online comparison fallback.
   UI-only filtering and market-reference display: this module never writes to
   quote_catalog_products or changes GearCashOut buying prices. */
(function(){
  'use strict';

  const money=value=>Number(value).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
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

  async function updateCardOnlineComparison(card){
    const supabase=window.actionBuyerAuth?.supabase;
    const id=card?.dataset?.productId;
    const panel=card?.querySelector('.catalog-accordion-panel');
    if(!supabase||!id||!panel)return;

    let rows;
    const {data,error}=await supabase
      .from('quote_catalog_retailer_prices')
      .select('retailer,price_type,sell_price,availability_status,notes')
      .eq('catalog_product_id',id)
      .in('price_type',['new','new_sale']);
    if(error){console.error('Online comparison price lookup failed',error);return;}
    rows=data||[];

    const prices=rows
      .filter(r=>r.sell_price!=null&&isConsumerPrice(r)&&['in_stock','unknown'].includes(String(r.availability_status||'').toLowerCase()))
      .map(r=>Number(r.sell_price))
      .filter(Number.isFinite)
      .sort((a,b)=>a-b);
    if(!prices.length)return;

    const comparison=prices.length===1?money(prices[0]):`${money(prices[0])}–${money(prices[prices.length-1])}`;
    const summary=panel.querySelector('.catalog-accordion-summary');
    if(!summary)return;

    let stat=summary.querySelector('.online-comparison-stat');
    if(!stat){
      stat=document.createElement('div');
      stat.className='catalog-accordion-stat online-comparison-stat';
      summary.appendChild(stat);
    }
    stat.innerHTML=`<strong>${comparison}</strong><span>Online comparison</span>`;

    /* If there is no manufacturer RRP, use this as the visible reference in
       the product row as well. The database RRP itself is not changed. */
    const title=card.querySelector('.catalog-accordion-title p');
    if(title&&/^RRP\s+—/i.test(title.textContent.trim())){
      const text=title.textContent;
      const marker=' · Sealed ';
      const suffix=text.includes(marker)?text.slice(text.indexOf(marker)):'';
      title.textContent=`Online comparison ${comparison}${suffix}`;
    }
  }

  function wire(){
    const filter=document.getElementById('status-filter');
    const list=document.getElementById('catalog-list');
    if(!filter||!list||list.dataset.statusFilterWired==='1')return;
    list.dataset.statusFilterWired='1';
    filter.addEventListener('change',applyStatusFilter);
    list.addEventListener('click',e=>{
      const trigger=e.target.closest('.catalog-accordion-trigger');
      if(!trigger)return;
      const card=trigger.closest('.catalog-accordion-card');
      if(!card)return;
      setTimeout(()=>{
        if(card.classList.contains('is-open'))updateCardOnlineComparison(card);
      },250);
    });
    applyStatusFilter();
  }

  document.addEventListener('DOMContentLoaded',wire);
})();
