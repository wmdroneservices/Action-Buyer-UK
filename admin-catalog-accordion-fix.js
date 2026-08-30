/* Converts the existing catalogue cards into inline expandable rows. */
(function(){
  const sb=()=>window.actionBuyerAuth?.supabase;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v==null||v===''?'—':`£${Number(v).toFixed(2)}`;
  const cache=new Map();

  function styles(){
    if(document.getElementById('inline-catalog-style'))return;
    const s=document.createElement('style');s.id='inline-catalog-style';s.textContent=`
      .catalog-accordion-card{display:block!important;padding:0!important;overflow:hidden}
      .catalog-accordion-trigger{width:100%;border:0;background:transparent;text-align:left;padding:1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;cursor:pointer;font:inherit;color:inherit}
      .catalog-accordion-trigger:hover{background:#f8f6f0}.catalog-accordion-trigger:focus-visible{outline:3px solid #102f4f;outline-offset:-3px}
      .catalog-accordion-title{min-width:0;flex:1}.catalog-accordion-title h3{margin:.15rem 0}.catalog-accordion-title p{margin:.25rem 0}.catalog-accordion-chevron{font-size:1.2rem;transition:transform .18s ease}.catalog-accordion-card.is-open .catalog-accordion-chevron{transform:rotate(180deg)}
      .catalog-accordion-panel{display:none;border-top:1px solid #e3dfd5;padding:1rem;background:#fffdf8}.catalog-accordion-card.is-open .catalog-accordion-panel{display:block}
      .catalog-accordion-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin-bottom:1rem}.catalog-accordion-stat{border:1px solid #e3dfd5;border-radius:8px;background:#fff;padding:.7rem}.catalog-accordion-stat strong{display:block;color:#102f4f}.catalog-accordion-stat span{font-size:.76rem;color:#666}
      .catalog-accordion-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem}.catalog-accordion-market{overflow-x:auto}.catalog-accordion-market table{width:100%;border-collapse:collapse;min-width:850px}.catalog-accordion-market th,.catalog-accordion-market td{padding:.5rem;border-bottom:1px solid #e5e1d8;text-align:left;vertical-align:top}.catalog-accordion-market th{font-size:.76rem;color:#102f4f;background:#f5f2ea}
      .catalog-accordion-empty{color:#666;padding:.5rem 0}
      @media(max-width:700px){.catalog-accordion-summary{grid-template-columns:1fr 1fr}}@media(max-width:480px){.catalog-accordion-summary{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function transform(){
    styles();const list=document.getElementById('catalog-list');if(!list)return;
    list.querySelectorAll('.valuation-card:not(.catalog-accordion-card)').forEach(card=>{
      const edit=card.querySelector('.edit-product');const id=edit?.dataset.id;if(!id)return;
      const ref=card.querySelector('.valuation-ref')?.outerHTML||'';const h3=card.querySelector('h3')?.outerHTML||'';const p=card.querySelector('.valuation-card > div:first-child p')?.outerHTML||'';const meta=card.querySelector('.valuation-meta')?.innerHTML||'';
      card.classList.add('catalog-accordion-card');
      card.innerHTML=`<button type="button" class="catalog-accordion-trigger" aria-expanded="false"><span class="catalog-accordion-title">${ref}${h3}${p}</span><span class="catalog-accordion-chevron" aria-hidden="true">⌄</span></button><div class="catalog-accordion-panel" aria-hidden="true"><div class="catalog-accordion-empty">Loading market research…</div></div>`;
      card.dataset.productId=id;
    });
  }

  async function panel(card){
    const id=card.dataset.productId,panel=card.querySelector('.catalog-accordion-panel');let rows=cache.get(id);
    if(!rows){
      const r=await sb().from('quote_catalog_retailer_prices').select('id,retailer,price_type,condition,buy_price,sell_price,availability_status,buy_method,source_url,notes,checked_at').eq('catalog_product_id',id).order('retailer').order('price_type').order('condition').order('sell_price');
      if(r.error){panel.innerHTML=`<div class="catalog-accordion-empty">Unable to load market research: ${esc(r.error.message)}</div>`;return;}rows=r.data||[];cache.set(id,rows);
    }
    const prices=rows.flatMap(r=>[r.buy_price,r.sell_price]).map(Number).filter(Number.isFinite);const low=prices.length?Math.min(...prices):null,high=prices.length?Math.max(...prices):null;
    panel.innerHTML=`<div class="catalog-accordion-summary"><div class="catalog-accordion-stat"><strong>${rows.length}</strong><span>Market evidence records</span></div><div class="catalog-accordion-stat"><strong>${money(low)}</strong><span>Lowest recorded price</span></div><div class="catalog-accordion-stat"><strong>${money(high)}</strong><span>Highest recorded price</span></div></div><div class="catalog-accordion-actions"><button type="button" class="btn btn-secondary catalog-inline-edit" data-id="${esc(id)}">EDIT PRODUCT</button></div>${rows.length?`<div class="catalog-accordion-market"><table><thead><tr><th>Website / Competitor</th><th>Price type</th><th>Condition</th><th>Buying</th><th>Selling</th><th>Availability</th><th>Source</th><th>Notes</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.retailer)}</td><td>${esc(String(r.price_type||'').replaceAll('_',' '))}</td><td>${esc(r.condition)}</td><td>${r.buy_price==null?'—':money(r.buy_price)}</td><td>${r.sell_price==null?'—':money(r.sell_price)}</td><td>${esc(String(r.availability_status||'').replaceAll('_',' '))}</td><td>${r.source_url?`<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`:'—'}</td><td>${esc(r.notes)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="catalog-accordion-empty">No market research recorded for this product yet.</div>'}`;
  }

  async function edit(id){
    const r=await sb().from('quote_catalog_products').select('id,category,manufacturer,model,package_key,package_name,manufacturer_rrp,manufacturer_rrp_currency,manufacturer_rrp_source,manufacturer_rrp_verified_at,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active,notes,updated_at').eq('id',id).single();
    if(r.error){alert(r.error.message);return;}if(typeof window.loadProduct==='function')window.loadProduct(r.data);
  }

  function wire(){
    const list=document.getElementById('catalog-list');if(!list||list.dataset.inlineAccordion==='1')return;list.dataset.inlineAccordion='1';
    list.addEventListener('click',e=>{
      const editBtn=e.target.closest('.catalog-inline-edit');if(editBtn){e.preventDefault();e.stopPropagation();edit(editBtn.dataset.id);return;}
      const trigger=e.target.closest('.catalog-accordion-trigger');if(!trigger)return;e.preventDefault();e.stopPropagation();const card=trigger.closest('.catalog-accordion-card');const open=card.classList.toggle('is-open');trigger.setAttribute('aria-expanded',String(open));card.querySelector('.catalog-accordion-panel').setAttribute('aria-hidden',String(!open));if(open)panel(card);
    });
    transform();
    new MutationObserver(()=>transform()).observe(list,{childList:true});
  }
  document.addEventListener('DOMContentLoaded',wire);
})();
