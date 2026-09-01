/* Catalogue accordion: keep UK pricing separate from international evidence and never convert currencies. */
(function(){
  const sb=()=>window.actionBuyerAuth?.supabase;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const cache=new Map();
  const symbol={GBP:'£',USD:'$',EUR:'€',CAD:'C$',AUD:'A$',NZD:'NZ$',JPY:'¥',CNY:'¥',CHF:'CHF ',SEK:'kr ',NOK:'kr ',DKK:'kr ',PLN:'zł ',CZK:'Kč ',INR:'₹'};
  const money=(v,c='GBP')=>v==null||v===''?'—':`${symbol[String(c||'').toUpperCase()]||`${String(c||'').toUpperCase()} `}${Number(v).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const isUK=r=>String(r?.price_currency||'').toUpperCase()==='GBP'&&String(r?.evidence_region||'').toUpperCase()==='UK';

  function styles(){
    if(document.getElementById('inline-catalog-style'))return;
    const s=document.createElement('style');s.id='inline-catalog-style';s.textContent=`
      .catalog-accordion-card{display:block!important;padding:0!important;overflow:hidden}
      .catalog-accordion-trigger{width:100%;border:0;background:transparent;text-align:left;padding:1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;cursor:pointer;font:inherit;color:inherit}
      .catalog-accordion-trigger:hover{background:#f8f6f0}.catalog-accordion-trigger:focus-visible{outline:3px solid #102f4f;outline-offset:-3px}
      .catalog-accordion-title{min-width:0;flex:1}.catalog-accordion-title h3{margin:.15rem 0}.catalog-accordion-title p{margin:.25rem 0}.catalog-accordion-chevron{font-size:1.2rem;transition:transform .18s ease}.catalog-accordion-card.is-open .catalog-accordion-chevron{transform:rotate(180deg)}
      .catalog-title-status{display:inline-flex;align-items:center;justify-content:center;margin-left:.45rem;padding:.18rem .5rem;border:0;border-radius:999px;font:inherit;font-size:.68rem;font-weight:800;line-height:1.2;letter-spacing:.01em;cursor:pointer;vertical-align:middle}
      .catalog-title-status.active{background:#dff3e4;color:#18733b}.catalog-title-status.inactive{background:#f8dddd;color:#a32323}.catalog-title-status.saving{opacity:.65;cursor:wait}.catalog-title-status:focus-visible{outline:3px solid #102f4f;outline-offset:2px}
      .catalog-accordion-panel{display:none;border-top:1px solid #e3dfd5;padding:1rem;background:#fffdf8}.catalog-accordion-card.is-open .catalog-accordion-panel{display:block}
      .catalog-accordion-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin-bottom:1rem}.catalog-accordion-stat{border:1px solid #e3dfd5;border-radius:8px;background:#fff;padding:.7rem}.catalog-accordion-stat strong{display:block;color:#102f4f}.catalog-accordion-stat span{font-size:.76rem;color:#666}
      .catalog-accordion-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem}.catalog-accordion-market{overflow-x:auto}.catalog-accordion-market table{width:100%;border-collapse:collapse;min-width:850px}.catalog-accordion-market th,.catalog-accordion-market td{padding:.5rem;border-bottom:1px solid #e5e1d8;text-align:left;vertical-align:top}.catalog-accordion-market th{font-size:.76rem;color:#102f4f;background:#f5f2ea}
      .catalog-international-section{margin-top:1.25rem;padding-top:1rem;border-top:2px solid #d88732}.catalog-international-section h3{margin:.1rem 0 .35rem;color:#102f4f}.catalog-international-section p{margin:0 0 .75rem;color:#666;font-size:.88rem}.catalog-international-section table{min-width:1050px}.catalog-international-badge{display:inline-block;margin-left:.4rem;padding:.15rem .45rem;border-radius:999px;background:#f3eee5;color:#102f4f;font-size:.68rem;font-weight:800}
      .catalog-accordion-empty{color:#666;padding:.5rem 0}
      @media(max-width:700px){.catalog-accordion-summary{grid-template-columns:1fr 1fr}}@media(max-width:480px){.catalog-accordion-summary{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function amazonProductUrl(row,product){
    const original=String(row?.source_url||'').trim();
    if(!/amazon\./i.test(`${row?.retailer||''} ${original}`))return original;
    if(/amazon\.[^/]+\/[^/]*(?:\/dp\/|\/gp\/product\/|\/product\/)/i.test(original))return original;
    const query=String(product?.query||'').trim();
    if(!query)return original;
    return `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
  }

  function transform(){
    styles();const list=document.getElementById('catalog-list');if(!list)return;
    list.querySelectorAll('.valuation-card:not(.catalog-accordion-card)').forEach(card=>{
      const edit=card.querySelector('.edit-product');const id=edit?.dataset.id;if(!id)return;
      const ref=card.querySelector('.valuation-ref')?.outerHTML||'';
      const h3=card.querySelector('h3')?.outerHTML||'';
      const p=card.querySelector('.valuation-card > div:first-child p')?.outerHTML||'';
      const active=String(card.querySelector('.status-badge')?.textContent||'').trim().toLowerCase()==='active';
      const title=h3.replace('</h3>',` <span class="catalog-title-status ${active?'active':'inactive'}" data-id="${esc(id)}" role="button" tabindex="0" aria-label="Change active status">${active?'ACTIVE':'INACTIVE'}</span></h3>`);
      card.classList.add('catalog-accordion-card');card.dataset.productId=id;card.dataset.active=active?'true':'false';
      card.innerHTML=`<div class="catalog-accordion-trigger" role="button" tabindex="0" aria-expanded="false"><span class="catalog-accordion-title">${ref}${title}${p}</span><span class="catalog-accordion-chevron" aria-hidden="true">⌄</span></div><div class="catalog-accordion-panel" aria-hidden="true"><div class="catalog-accordion-empty">Loading market research…</div></div>`;
    });
  }

  async function setActive(card,status){
    const id=card.dataset.productId;if(!id||!status)return;
    const auth=window.actionBuyerAuth;if(!auth?.supabase){showError('Authentication system unavailable.');return;}
    const session=await auth.getSession();if(!session){showError('Your staff session has expired. Please sign in again.');return;}
    const current=card.dataset.active==='true',desired=!current;status.classList.add('saving');status.textContent='SAVING…';
    const {error}=await auth.supabase.from('quote_catalog_products').update({active:desired,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){status.classList.remove('saving');status.textContent=current?'ACTIVE':'INACTIVE';showError(error.message);return;}
    card.dataset.active=desired?'true':'false';status.classList.remove('saving');status.textContent=desired?'ACTIVE':'INACTIVE';status.classList.toggle('active',desired);status.classList.toggle('inactive',!desired);
    const msg=document.getElementById('catalog-message');if(msg){msg.textContent=`Product ${desired?'activated':'deactivated'}.`;msg.className='form-message success';}
  }

  function showError(text){const msg=document.getElementById('catalog-message');if(msg){msg.textContent=`Active status update failed: ${text}`;msg.className='form-message error';}}

  function renderUk(rows){
    const uk=rows.filter(isUK);
    const prices=uk.flatMap(r=>[r.buy_price,r.sell_price]).map(Number).filter(Number.isFinite);
    const low=prices.length?Math.min(...prices):null,high=prices.length?Math.max(...prices):null;
    const grid=document.getElementById('uk-market-reference-grid');
    if(grid)grid.innerHTML=uk.length?`<div class="uk-market-stat"><strong>${uk.length}</strong><span>UK GBP evidence records</span></div><div class="uk-market-stat"><strong>${money(low,'GBP')}</strong><span>Lowest verified UK price</span></div><div class="uk-market-stat"><strong>${money(high,'GBP')}</strong><span>Highest verified UK price</span></div>`:'<div class="uk-market-stat"><strong>—</strong><span>No UK GBP market evidence recorded</span></div>';
    return uk;
  }

  function foreignTable(rows,product){
    const foreign=rows.filter(r=>!isUK(r));
    if(!foreign.length)return '';
    return `<section class="catalog-international-section"><h3>International Evidence (Non-UK) <span class="catalog-international-badge">ORIGINAL CURRENCY — NO CONVERSION</span></h3><p>All evidence that is not UK GBP pricing is retained here in the currency and region in which it was found. These values do not feed UK Online comparison and are never converted to pounds.</p><div class="catalog-accordion-market"><table><thead><tr><th>Website / Competitor</th><th>Price type</th><th>Condition</th><th>Currency</th><th>Region</th><th>Buying</th><th>Selling</th><th>Availability</th><th>Source</th><th>Notes</th></tr></thead><tbody>${foreign.map(r=>{const c=String(r.price_currency||'').toUpperCase()||'UNKNOWN';const region=String(r.evidence_region||'').trim()||String(r.price_region||'').trim()||'International';const source=amazonProductUrl(r,product);return `<tr><td>${esc(r.retailer)}</td><td>${esc(String(r.price_type||'').replaceAll('_',' '))}</td><td>${esc(r.condition)}</td><td><strong>${esc(c)}</strong></td><td>${esc(region)}${r.price_region?`<br><small>${esc(r.price_region)}</small>`:''}</td><td>${r.buy_price==null?'—':money(r.buy_price,c)}</td><td>${r.sell_price==null?'—':money(r.sell_price,c)}</td><td>${esc(String(r.availability_status||'').replaceAll('_',' '))}</td><td>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`:'—'}</td><td>${esc(r.notes)}</td></tr>`;}).join('')}</tbody></table></div></section>`;
  }

  async function panel(card){
    const id=card.dataset.productId,panel=card.querySelector('.catalog-accordion-panel');let rows=cache.get(id);
    if(!rows){const r=await sb().from('quote_catalog_retailer_prices').select('id,retailer,price_type,condition,buy_price,sell_price,availability_status,buy_method,source_url,notes,checked_at,price_currency,price_region,evidence_region').eq('catalog_product_id',id).order('retailer').order('price_type').order('condition').order('sell_price');if(r.error){panel.innerHTML=`<div class="catalog-accordion-empty">Unable to load market research: ${esc(r.error.message)}</div>`;return;}rows=r.data||[];cache.set(id,rows);}
    const product={query:card.querySelector('.catalog-accordion-title h3')?.textContent?.replace(/\s+(ACTIVE|INACTIVE)\s*$/i,'').trim()||''};
    const uk=renderUk(rows);
    const prices=uk.flatMap(r=>[r.buy_price,r.sell_price]).map(Number).filter(Number.isFinite),low=prices.length?Math.min(...prices):null,high=prices.length?Math.max(...prices):null;
    panel.innerHTML=`<div class="catalog-accordion-summary"><div class="catalog-accordion-stat"><strong>${uk.length}</strong><span>UK GBP evidence records</span></div><div class="catalog-accordion-stat"><strong>${money(low,'GBP')}</strong><span>Lowest UK recorded price</span></div><div class="catalog-accordion-stat"><strong>${money(high,'GBP')}</strong><span>Highest UK recorded price</span></div></div><div class="catalog-accordion-actions"><button type="button" class="btn btn-secondary catalog-inline-edit" data-id="${esc(id)}">EDIT PRODUCT</button></div>${uk.length?`<div class="catalog-accordion-market"><table><thead><tr><th>Website / Competitor</th><th>Price type</th><th>Condition</th><th>Buying</th><th>Selling</th><th>Availability</th><th>Source</th><th>Notes</th></tr></thead><tbody>${uk.map(r=>{const source=amazonProductUrl(r,product);return `<tr><td>${esc(r.retailer)}</td><td>${esc(String(r.price_type||'').replaceAll('_',' '))}</td><td>${esc(r.condition)}</td><td>${r.buy_price==null?'—':money(r.buy_price,'GBP')}</td><td>${r.sell_price==null?'—':money(r.sell_price,'GBP')}</td><td>${esc(String(r.availability_status||'').replaceAll('_',' '))}</td><td>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`:'—'}</td><td>${esc(r.notes)}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="catalog-accordion-empty">No UK GBP market evidence recorded for this product.</div>'}${foreignTable(rows,product)}`;
  }

  async function edit(id){const r=await sb().from('quote_catalog_products').select('id,category,manufacturer,model,package_key,package_name,manufacturer_rrp,manufacturer_rrp_currency,manufacturer_rrp_source,manufacturer_rrp_verified_at,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active,notes,updated_at').eq('id',id).single();if(r.error){alert(r.error.message);return;}if(typeof window.loadProduct==='function')window.loadProduct(r.data);}

  function activateStatus(status){const card=status.closest('.catalog-accordion-card');if(card&&!status.classList.contains('saving'))setActive(card,status);}

  function wire(){
    const list=document.getElementById('catalog-list');if(!list||list.dataset.inlineAccordion==='1')return;list.dataset.inlineAccordion='1';
    list.addEventListener('click',e=>{const status=e.target.closest('.catalog-title-status');if(status){e.preventDefault();e.stopPropagation();activateStatus(status);return;}const editBtn=e.target.closest('.catalog-inline-edit');if(editBtn){e.preventDefault();e.stopPropagation();edit(editBtn.dataset.id);return;}const trigger=e.target.closest('.catalog-accordion-trigger');if(!trigger)return;e.preventDefault();e.stopPropagation();const card=trigger.closest('.catalog-accordion-card');const open=card.classList.toggle('is-open');trigger.setAttribute('aria-expanded',String(open));card.querySelector('.catalog-accordion-panel').setAttribute('aria-hidden',String(!open));if(open)panel(card);});
    list.addEventListener('keydown',e=>{const status=e.target.closest('.catalog-title-status');if(status&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();activateStatus(status);}else if(status)e.stopPropagation();const trigger=e.target.closest('.catalog-accordion-trigger');if(trigger&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();const card=trigger.closest('.catalog-accordion-card');const open=card.classList.toggle('is-open');trigger.setAttribute('aria-expanded',String(open));card.querySelector('.catalog-accordion-panel').setAttribute('aria-hidden',String(!open));if(open)panel(card);}});
    transform();new MutationObserver(()=>transform()).observe(list,{childList:true});
  }
  document.addEventListener('DOMContentLoaded',wire);
})();