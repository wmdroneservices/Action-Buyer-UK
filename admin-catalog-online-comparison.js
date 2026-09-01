/* GearCashOut: render direct-retailer Online Comparison values in each catalogue product bar. */
(function(){
  'use strict';
  const money=v=>`£${Number(v).toFixed(2)}`;
  const excludedSource=/eBay\.|Vinted\.|Facebook\.|Gumtree\.|Etsy\.|Depop\.|Shpock\.|auction|marketplace|reseller|classified|pricespy\.|idealo\.|supersales\.|onbuy\.|pricerunner\.|kelkoo\.|shopzilla\.|shopping\.google\.|shop\.autelrobotics\.com/i;
  const excludedRetailer=/amazon\s+marketplace|marketplace|reseller|comparison|pricespy|supersales|onbuy|pricerunner|research\s+audit/i;
  const qualifyingTypes=new Set(['new','new_sale','market']);
  const cache=new Map();
  const officialLinks=new Map();
  let wired=false;
  function isDirectRetail(row){
    if(!row||row.sell_price==null)return false;
    if(!qualifyingTypes.has(String(row.price_type||'').toLowerCase()))return false;
    // Online Comparison is strictly UK GBP evidence. International prices must remain
    // in the separate international evidence section and can never populate this value.
    const currency=String(row.price_currency||'GBP').toUpperCase();
    const region=String(row.evidence_region||'UK').toUpperCase();
    if(currency!=='GBP'||region!=='UK')return false;
    if(excludedSource.test(`${row.retailer||''} ${row.source_url||''}`))return false;
    if(excludedRetailer.test(String(row.retailer||'')))return false;
    const notes=String(row.notes||'');
    if(/\bex\.?\s*vat\b|excluding\s+vat|plus\s+vat|vat\s+excluded/i.test(notes))return false;
    if(/\$|\bUSD\b|\bEUR\b|€|\bUS\b|\bEU\b/i.test(notes))return false;
    if(!/^https?:\/\//i.test(String(row.source_url||'')))return false;
    const condition=String(row.condition||'').trim();
    if(String(row.price_type||'').toLowerCase()==='market' && !/^(new|new\s*[-–]?\s*sale|new\s*\/\s*never\s*used)$/i.test(condition))return false;
    const availability=String(row.availability_status||'').toLowerCase();
    // A valid current/recent UK price remains a comparison even when temporarily out of stock.
    // Only an explicitly discontinued source is excluded.
    if(availability==='out_of_stock'){
      if(/\bdiscontinued\b/i.test(notes))return false;
    } else if(!['in_stock','unknown'].includes(availability))return false;
    return true;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function getTitle(card){return card.querySelector('.catalog-accordion-title')||card.querySelector('.valuation-card > div:first-child');}
  function getProductId(card){return card?.dataset?.productId||card?.querySelector('.edit-product')?.dataset?.id;}
  function ensureOfficialLink(card,id){
    if(!id)return;
    const title=getTitle(card);if(!title)return;
    if(!/^DJI\b/i.test((title.textContent||'').trim()))return;
    const url=officialLinks.get(id);if(!url)return;
    let link=title.querySelector('.catalog-official-manufacturer-link');
    if(!link){
      link=document.createElement('a');
      link.className='catalog-official-manufacturer-link';
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='OPEN DJI OFFICIAL PRODUCT PAGE ↗';
      link.style.cssText='display:inline-block;margin-top:.25rem;font-size:.72rem;font-weight:700;color:#102f4f;text-decoration:underline;';
      title.appendChild(link);
    }
    if(link.href!==url)link.href=url;
  }
  function setPrice(card){
    const id=getProductId(card); if(!id)return;
    const title=getTitle(card); if(!title)return;
    const p=title.querySelector('p'); if(!p)return;
    const existing=p.dataset.catalogConditions;
    let conditions=existing;
    if(!conditions){
      conditions=(p.textContent||'').replace(/^\s*(?:Online comparison\s+(?:£[\d,]+(?:\.\d{2})?(?:–£[\d,]+(?:\.\d{2})?)?|—)|RRP\s+[^·]+)\s*·\s*/i,'').trim();
      p.dataset.catalogConditions=conditions;
    }
    const prices=cache.get(id)||[];
    const unique=[...new Set(prices)].sort((a,b)=>a-b);
    const label=!unique.length?'Online comparison —':unique.length===1?`Online comparison ${money(unique[0])}`:`Online comparison ${money(unique[0])}–${money(unique[unique.length-1])}`;
    const desired=`${label} · ${conditions}`;
    if(p.dataset.onlineComparisonRendered!==desired){
      p.innerHTML=`<span class="catalog-online-comparison-text">${esc(label)}</span> · ${esc(conditions)}`;
      p.dataset.onlineComparisonRendered=desired;
    }
    ensureOfficialLink(card,id);
  }
  function renderAll(){document.querySelectorAll('#catalog-list .valuation-card').forEach(setPrice);}
  async function fetchPrices(){
    const api=window.actionBuyerAuth?.supabase; if(!api)return;
    const next=new Map(); let from=0; const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices').select('catalog_product_id,retailer,price_type,condition,sell_price,availability_status,source_url,notes,price_currency,evidence_region').in('price_type',['new','new_sale','market']).range(from,from+pageSize-1);
      if(error){console.error('Online comparison price lookup failed',error);return;}
      (data||[]).forEach(row=>{
        if(!isDirectRetail(row))return;
        const price=Number(row.sell_price);
        if(!Number.isFinite(price)||price<=0||!row.catalog_product_id)return;
        if(!next.has(row.catalog_product_id))next.set(row.catalog_product_id,[]);
        next.get(row.catalog_product_id).push(price);
      });
      if(!data||data.length<pageSize)break; from+=pageSize;
    }
    cache.clear();next.forEach((v,k)=>cache.set(k,v)); renderAll();
  }
  async function fetchOfficialLinks(){
    const api=window.actionBuyerAuth?.supabase;if(!api)return;
    const next=new Map();let from=0;const pageSize=1000;
    while(true){
      const {data,error}=await api.from('quote_catalog_retailer_prices').select('catalog_product_id,retailer,source_url').range(from,from+pageSize-1);
      if(error){console.error('Official DJI link lookup failed',error);return;}
      (data||[]).forEach(row=>{
        const url=String(row.source_url||'');
        if(!/^https?:\/\/(?:store\.)?dji\.com\//i.test(url))return;
        if(!row.catalog_product_id)return;
        const current=next.get(row.catalog_product_id)||'';
        const score=u=>/store\.dji\.com\/uk\/product\//i.test(u)?3:/www\.dji\.com\/uk\//i.test(u)?2:/store\.dji\.com\/uk\//i.test(u)?1:0;
        if(!current||score(url)>score(current))next.set(row.catalog_product_id,url);
      });
      if(!data||data.length<pageSize)break;from+=pageSize;
    }
    officialLinks.clear();next.forEach((v,k)=>officialLinks.set(k,v));renderAll();
  }
  function wire(){
    const list=document.getElementById('catalog-list'); if(!list||wired)return;
    wired=true;
    const observer=new MutationObserver(()=>renderAll()); observer.observe(list,{childList:true});
    renderAll(); fetchPrices(); fetchOfficialLinks();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
})();

/* Website / Competitor dropdown. */
(function(){
  'use strict';
  const websites=[
    ['Bright Tangerine','https://brighttangerine.com/'],['BetaFPV','https://betafpv.com/'],['DJI','https://www.dji.com/'],['Autel Robotics','https://www.autelrobotics.com/'],['HobbyKing','https://hobbyking.com/'],['GetFPV','https://www.getfpv.com/'],['iFlight','https://www.iflight.com/'],['GEPRC','https://geprc.com/'],['Rotor Riot','https://rotorriot.com/'],['SkyFleetDrones','https://skyfleetdrones.com/collections/all'],['RadioMaster','https://www.radiomasterrc.com/'],['EMAX','https://emaxmodel.com/'],['YouDrone','https://youdrone.co.uk/'],['IT Drone UK','https://shop.itdroneservices.co.uk/collections/fimi-store'],['Amazon UK','https://www.amazon.co.uk/'],['eBay UK','https://www.ebay.co.uk/'],['MPB','https://www.mpb.com/en-uk/'],['CeX','https://uk.webuy.com/'],['Gumtree','https://www.gumtree.com/'],['Vinted','https://www.vinted.co.uk/'],['Facebook Marketplace','https://www.facebook.com/marketplace/'],['Custom / Other','']
  ];
  const urlMap=new Map(websites.map(([name,url])=>[name.toLowerCase(),url])); let observer=null;
  function safeUrl(v){try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
  function enhanceRow(tr){
    if(!tr||tr.dataset.competitorEnhanced==='1')return; const input=tr.querySelector('.retailer');if(!input)return;
    const current=(input.value||'').trim(); const select=document.createElement('select');select.className='retailer competitor-select';select.setAttribute('aria-label','Website / Competitor');
    const known=websites.map(([name])=>name);if(current&&!known.some(name=>name.toLowerCase()===current.toLowerCase())){const existing=document.createElement('option');existing.value=current;existing.textContent=current;select.appendChild(existing);}
    websites.forEach(([name])=>{const option=document.createElement('option');option.value=name;option.textContent=name;select.appendChild(option);});
    const match=known.find(name=>name.toLowerCase()===current.toLowerCase());select.value=match||current||'Custom / Other';input.replaceWith(select);
    const link=document.createElement('a');link.className='retailer-link competitor-website-link';link.target='_blank';link.rel='noopener noreferrer';link.textContent='OPEN WEBSITE ↗';select.closest('td').appendChild(link);
    const sourceInput=tr.querySelector('.retailer-source');
    function updateLink(){const canonical=urlMap.get(select.value.toLowerCase())||'';const source=safeUrl(sourceInput?.value?.trim());const isCustom=!canonical&&select.value.toLowerCase()==='custom / other';const url=canonical||(isCustom?source:'');if(url){link.href=url;link.classList.remove('disabled');link.title=canonical?'Open the competitor website':'Open the recorded source page';}else{link.removeAttribute('href');link.classList.add('disabled');link.title='Enter a source URL for this competitor';}}
    select.addEventListener('change',updateLink);sourceInput?.addEventListener('input',updateLink);updateLink();tr.dataset.competitorEnhanced='1';
  }
  function enhanceRows(){document.querySelectorAll('#retailer-prices-body tr[data-index]').forEach(enhanceRow);}
  function wire(){const body=document.getElementById('retailer-prices-body');if(!body||observer)return;observer=new MutationObserver(enhanceRows);observer.observe(body,{childList:true,subtree:true});enhanceRows();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();