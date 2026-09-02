/* Inline accordion for the Automatic Quote Catalogue.
   Catalogue browsing stays in place; the existing EDIT action remains available.
*/
(function(){
  const sb=()=>window.actionBuyerAuth?.supabase;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v===null||v===undefined||v===''?'—':`£${Number(v).toFixed(2)}`;
  const cache=new Map();
  const evidenceKey=r=>[
    String(r.retailer||'').trim().toLowerCase(),
    String(r.price_type||'').trim().toLowerCase(),
    String(r.condition||'').trim().toLowerCase(),
    r.buy_price??'',r.sell_price??'',
    String(r.source_url||'').trim().replace(/\/$/,'').toLowerCase()
  ].join('|');
  const dedupeEvidenceRows=rows=>{
    const seen=new Set();
    return (rows||[]).filter(r=>{const key=evidenceKey(r);if(seen.has(key))return false;seen.add(key);return true;});
  };
  const evidenceKey=r=>[
    String(r.retailer||'').trim().toLowerCase(),
    String(r.price_type||'').trim().toLowerCase(),
    String(r.condition||'').trim().toLowerCase(),
    r.buy_price??'',r.sell_price??'',
    String(r.source_url||'').trim().replace(/\\/$/,'').toLowerCase()
  ].join('|');
  const dedupeEvidenceRows=rows=>{
    const seen=new Set();
    return (rows||[]).filter(r=>{const key=evidenceKey(r);if(seen.has(key))return false;seen.add(key);return true;});
  };

  function addStyles(){
    if(document.getElementById('catalog-accordion-styles'))return;
    const s=document.createElement('style');s.id='catalog-accordion-styles';s.textContent=`
      .catalog-accordion-card{display:block;padding:0!important;overflow:hidden}
      .catalog-accordion-trigger{width:100%;border:0;background:transparent;text-align:left;padding:1rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;cursor:pointer;font:inherit;color:inherit}
      .catalog-accordion-trigger:hover{background:#f8f6f0}
      .catalog-accordion-trigger:focus-visible{outline:3px solid #102f4f;outline-offset:-3px}
      .catalog-accordion-title{min-width:0}.catalog-accordion-title h3{margin:.15rem 0}.catalog-accordion-title p{margin:.25rem 0}
      .catalog-accordion-chevron{font-size:1.2rem;flex:0 0 auto;transition:transform .18s ease}.catalog-accordion-card.is-open .catalog-accordion-chevron{transform:rotate(180deg)}
      .catalog-accordion-panel{display:none;border-top:1px solid #e3dfd5;padding:1rem;background:#fffdf8}.catalog-accordion-card.is-open .catalog-accordion-panel{display:block}
      .catalog-accordion-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin-bottom:1rem}
      .catalog-accordion-stat{border:1px solid #e3dfd5;border-radius:8px;background:#fff;padding:.7rem}.catalog-accordion-stat strong{display:block;color:#102f4f}.catalog-accordion-stat span{font-size:.76rem;color:#666}
      .catalog-accordion-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem}
      .catalog-accordion-market{overflow-x:auto}.catalog-accordion-market table{width:100%;border-collapse:collapse;min-width:850px}.catalog-accordion-market th,.catalog-accordion-market td{padding:.5rem;border-bottom:1px solid #e5e1d8;text-align:left;vertical-align:top}.catalog-accordion-market th{font-size:.76rem;color:#102f4f;background:#f5f2ea}
      .catalog-accordion-loading,.catalog-accordion-empty{color:#666;padding:.5rem 0}
      @media(max-width:700px){.catalog-accordion-summary{grid-template-columns:1fr 1fr}.catalog-accordion-trigger{padding:.85rem}}
      @media(max-width:480px){.catalog-accordion-summary{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function productCard(p){
    const card=document.createElement('div');card.className='valuation-card catalog-accordion-card';card.dataset.productId=p.id;
    const rrp=p.manufacturer_rrp===null||p.manufacturer_rrp===undefined?'—':money(p.manufacturer_rrp);
    card.innerHTML=`
      <button type="button" class="catalog-accordion-trigger" aria-expanded="false">
        <span class="catalog-accordion-title"><span class="valuation-ref">${esc(p.manufacturer)} · ${esc(p.category||'')}</span><h3>${esc(p.manufacturer)} ${esc(p.model)} — ${esc(p.package_name||p.package_key)}</h3><p>RRP ${rrp} ${esc(p.manufacturer_rrp_currency||'')} · Sealed ${money(p.factory_sealed_price)} · Unused ${money(p.opened_unused_price)} · Excellent ${money(p.excellent_price)} · Good ${money(p.good_price)} · Fair ${money(p.fair_price)}</p></span>
        <span class="catalog-accordion-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="catalog-accordion-panel" aria-hidden="true"><div class="catalog-accordion-loading">Loading market research…</div></div>`;
    return card;
  }

  async function loadPanel(card,p){
    const panel=card.querySelector('.catalog-accordion-panel');
    let rows=cache.get(p.id);
    if(!rows){
      const {data,error}=await sb().from('quote_catalog_retailer_prices').select('id,retailer,price_type,condition,buy_price,sell_price,availability_status,buy_method,source_url,notes,checked_at').eq('catalog_product_id',p.id).order('retailer').order('price_type').order('condition').order('sell_price');
      if(error){panel.innerHTML=`<div class="catalog-accordion-empty">Unable to load market research: ${esc(error.message)}</div>`;return;}
      rows=dedupeEvidenceRows(data||[]);cache.set(p.id,rows);
    }
    const selling=rows.filter(r=>r.sell_price!==null&&r.sell_price!==undefined);const buying=rows.filter(r=>r.buy_price!==null&&r.buy_price!==undefined);
    const allPrices=[...selling.map(r=>Number(r.sell_price)),...buying.map(r=>Number(r.buy_price))].filter(Number.isFinite);
    const lowest=allPrices.length?Math.min(...allPrices):null;
    const highest=allPrices.length?Math.max(...allPrices):null;
    panel.innerHTML=`
      <div class="catalog-accordion-summary">
        <div class="catalog-accordion-stat"><strong>${rows.length}</strong><span>Market evidence records</span></div>
        <div class="catalog-accordion-stat"><strong>${money(lowest)}</strong><span>Lowest recorded market price</span></div>
        <div class="catalog-accordion-stat"><strong>${money(highest)}</strong><span>Highest recorded market price</span></div>
      </div>
      <div class="catalog-accordion-actions"><span class="status-badge">${p.active?'Active':'Inactive'}</span><button type="button" class="btn btn-secondary catalog-edit-inline" data-id="${esc(p.id)}">EDIT PRODUCT</button></div>
      <div class="catalog-accordion-market">${rows.length?`<table><thead><tr><th>Website / Competitor</th><th>Price type</th><th>Condition</th><th>Buying</th><th>Selling</th><th>Availability</th><th>Source</th><th>Notes</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.retailer)}</td><td>${esc(String(r.price_type||'').replaceAll('_',' '))}</td><td>${esc(r.condition)}</td><td>${r.buy_price==null?'—':money(r.buy_price)}</td><td>${r.sell_price==null?'—':money(r.sell_price)}</td><td>${esc(String(r.availability_status||'').replaceAll('_',' '))}</td><td>${r.source_url?`<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`:'—'}</td><td>${esc(r.notes)}</td></tr>`).join('')}</tbody></table>`:'<div class="catalog-accordion-empty">No market research has been recorded for this product yet.</div>'}</div>`;
  }

  function openEditor(id){
    const products=window.catalogProductsForAccordion||[];const p=products.find(x=>x.id===id);if(typeof window.loadProduct==='function'&&p){window.loadProduct(p);}
  }

  function wire(){
    addStyles();
    const list=document.getElementById('catalog-list');if(!list||list.dataset.accordionWired==='1')return;
    list.dataset.accordionWired='1';
    list.addEventListener('click',function(e){
      const trigger=e.target.closest('.catalog-accordion-trigger');
      const inlineEdit=e.target.closest('.catalog-edit-inline');
      if(inlineEdit){e.preventDefault();e.stopPropagation();openEditor(inlineEdit.dataset.id);return;}
      if(!trigger)return;
      e.preventDefault();e.stopPropagation();
      const card=trigger.closest('.catalog-accordion-card');const open=card.classList.toggle('is-open');trigger.setAttribute('aria-expanded',String(open));card.querySelector('.catalog-accordion-panel').setAttribute('aria-hidden',String(!open));
      if(open){const p=(window.catalogProductsForAccordion||[]).find(x=>x.id===card.dataset.productId);if(p)loadPanel(card,p);}
    });
  }

  const observer=new MutationObserver(()=>{const list=document.getElementById('catalog-list');if(list){list.dataset.accordionWired='';wire();}});
  document.addEventListener('DOMContentLoaded',()=>{wire();observer.observe(document.getElementById('catalog-list')||document.body,{childList:true,subtree:false});});
})();
