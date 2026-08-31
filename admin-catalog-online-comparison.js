/* GearCashOut: direct UK online retail comparison in catalogue bars. */
(function(){
  'use strict';
  const A=()=>window.actionBuyerAuth;
  const S=()=>A()?.supabase;
  const safeUrl=v=>{try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const rowsByProduct=new Map();
  const productsById=new Map();
  const marketplace=/\b(ebay|vinted|facebook marketplace|gumtree|etsy|depop|shpock|auction|marketplace)\b/i;

  function money(v){return v==null||v===''?'—':`£${Number(v).toFixed(2)}`;}
  function styles(){
    if(document.getElementById('catalog-online-comparison-style'))return;
    const s=document.createElement('style');s.id='catalog-online-comparison-style';s.textContent=`
      .catalog-online-comparison-header{display:block;margin-top:.35rem;font-size:.72rem;font-weight:800;letter-spacing:.02em;color:#102f4f;text-decoration:underline}
      .catalog-online-comparison-header.no-price{color:#777;text-decoration:none;font-weight:700}
      .catalog-online-comparison-header .comparison-price{font-weight:900}
      .catalog-online-comparison{display:inline-flex;align-items:center;gap:.3rem;background:#102f4f!important;color:#fff!important;text-decoration:none!important;border:0!important}
      .catalog-online-comparison:hover{filter:brightness(1.08)}
    `;document.head.appendChild(s);
  }
  async function fetchAll(table,select){
    const out=[];let from=0;const pageSize=1000;
    while(true){const r=await S().from(table).select(select).range(from,from+pageSize-1);if(r.error)throw r.error;out.push(...(r.data||[]));if(!r.data||r.data.length<pageSize)break;from+=pageSize;}return out;
  }
  function isDirectRetail(row){
    if(!row||row.sell_price==null||row.sell_price==='')return false;
    const retailer=String(row.retailer||'');
    const url=String(row.source_url||'');
    if(marketplace.test(retailer)||marketplace.test(url))return false;
    return ['new','new_sale'].includes(String(row.price_type||'').toLowerCase());
  }
  function retailRows(p){return (rowsByProduct.get(p.id)||[]).filter(isDirectRetail).filter(r=>safeUrl(r.source_url));}
  function bestRetail(p){
    const rows=retailRows(p).map(r=>({...r,price:Number(r.sell_price)})).filter(r=>Number.isFinite(r.price));
    if(!rows.length)return null;
    rows.sort((a,b)=>a.price-b.price);
    return rows[0];
  }
  function bestUrl(p){return bestRetail(p)?.source_url||'';}
  async function loadData(){
    if(!S())return;
    const [ps,rs]=await Promise.all([
      fetchAll('quote_catalog_products','id,manufacturer,model,package_name'),
      fetchAll('quote_catalog_retailer_prices','catalog_product_id,retailer,price_type,sell_price,availability_status,source_url,checked_at')
    ]);
    ps.forEach(x=>productsById.set(x.id,x));
    rs.forEach(x=>{if(!rowsByProduct.has(x.catalog_product_id))rowsByProduct.set(x.catalog_product_id,[]);rowsByProduct.get(x.catalog_product_id).push(x);});
  }
  function addHeaderComparison(card,p){
    const title=card.querySelector('.catalog-accordion-title');if(!title)return;
    const old=title.querySelector('.catalog-online-comparison-header');if(old)old.remove();
    const row=bestRetail(p);
    const a=document.createElement('a');a.className='catalog-online-comparison-header';
    if(row){a.href=bestUrl(p);a.target='_blank';a.rel='noopener noreferrer';a.innerHTML=`ONLINE COMPARISON <span class="comparison-price">${money(row.price)}</span> ↗`;a.title=`Lowest direct UK retail selling price: ${money(row.price)} at ${row.retailer}`;a.addEventListener('click',e=>e.stopPropagation());}
    else{a.classList.add('no-price');a.textContent='ONLINE COMPARISON — NO DIRECT RETAIL PRICE';a.addEventListener('click',e=>e.stopPropagation());}
    title.appendChild(a);
  }
  function addComparison(card,p){
    const panel=card.querySelector('.catalog-accordion-panel');if(!panel)return;
    const actions=panel.querySelector('.catalog-accordion-actions');if(!actions||actions.querySelector('.catalog-online-comparison'))return;
    const row=bestRetail(p);if(!row)return;
    const a=document.createElement('a');a.className='btn btn-secondary catalog-online-comparison';a.href=bestUrl(p);a.target='_blank';a.rel='noopener noreferrer';a.textContent=`ONLINE COMPARISON ${money(row.price)} ↗`;a.addEventListener('click',e=>e.stopPropagation());actions.appendChild(a);
  }
  function removeRrpFromHeader(card){
    const title=card.querySelector('.catalog-accordion-title p');if(!title)return;
    const text=title.textContent||'';const cleaned=text.replace(/^RRP\s+[^·]+\s*·\s*/,'');if(cleaned!==text)title.textContent=cleaned;
  }
  function patch(){
    styles();document.querySelectorAll('#catalog-list .catalog-accordion-card').forEach(card=>{const p=productsById.get(card.dataset.productId);if(!p)return;removeRrpFromHeader(card);addHeaderComparison(card,p);addComparison(card,p);});
  }
  async function init(){try{await loadData();patch();const list=document.getElementById('catalog-list');if(list)new MutationObserver(()=>patch()).observe(list,{childList:true,subtree:true});}catch(e){console.error('Catalogue comparison enhancement failed',e);}}
  document.addEventListener('DOMContentLoaded',init);
})();
