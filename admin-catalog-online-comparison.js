/* GearCashOut: catalogue comparison links + currency-correct RRP display. */
(function(){
  'use strict';
  const A=()=>window.actionBuyerAuth;
  const S=()=>A()?.supabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(v,currency='GBP')=>{
    if(v===null||v===undefined||v==='')return '—';
    const code=String(currency||'GBP').toUpperCase();
    const symbols={GBP:'£',USD:'$',EUR:'€',CAD:'CA$',AUD:'A$',JPY:'¥'};
    const symbol=symbols[code]||'';
    const n=Number(v);
    return Number.isFinite(n)?`${symbol}${n.toFixed(2)}${symbol?'':' '+code}`:`${esc(v)} ${code}`;
  };
  const safeUrl=v=>{try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const rowsByProduct=new Map();
  const productsById=new Map();

  function styles(){
    if(document.getElementById('catalog-online-comparison-style'))return;
    const s=document.createElement('style');s.id='catalog-online-comparison-style';s.textContent=`
      .catalog-online-comparison{display:inline-flex;align-items:center;gap:.3rem;background:#102f4f!important;color:#fff!important;text-decoration:none!important;border:0!important}
      .catalog-online-comparison:hover{filter:brightness(1.08)}
      .catalog-online-comparison-header{display:inline-flex;align-items:center;margin-top:.35rem;font-size:.72rem;font-weight:800;letter-spacing:.02em;color:#102f4f;text-decoration:underline}
    `;document.head.appendChild(s);
  }

  async function fetchAll(table,select){
    const out=[];let from=0;const pageSize=1000;
    while(true){
      const r=await S().from(table).select(select).range(from,from+pageSize-1);
      if(r.error)throw r.error;
      out.push(...(r.data||[]));
      if(!r.data||r.data.length<pageSize)break;
      from+=pageSize;
    }
    return out;
  }

  async function loadData(){
    if(!S())return;
    const [products,retailerRows]=await Promise.all([
      fetchAll('quote_catalog_products','id,manufacturer,model,package_name,manufacturer_rrp,manufacturer_rrp_currency,manufacturer_rrp_source'),
      fetchAll('quote_catalog_retailer_prices','catalog_product_id,retailer,source_url,checked_at')
    ]);
    products.forEach(x=>productsById.set(x.id,x));
    retailerRows.forEach(x=>{const u=safeUrl(x.source_url);if(!u)return;if(!rowsByProduct.has(x.catalog_product_id))rowsByProduct.set(x.catalog_product_id,[]);rowsByProduct.get(x.catalog_product_id).push(x);});
  }

  function bestUrl(p){
    const manufacturer=String(p.manufacturer||'').trim().toLowerCase();
    const rows=rowsByProduct.get(p.id)||[];
    if(manufacturer==='akaso'){
      const priceSpy=rows.map(x=>safeUrl(x.source_url)).find(u=>/pricespy\.co\.uk/i.test(u));
      if(priceSpy)return priceSpy;
      return 'https://pricespy.co.uk/brand.php?t=51042';
    }
    const first=rows.map(x=>safeUrl(x.source_url)).find(Boolean);
    if(first)return first;
    const rrp=safeUrl(p.manufacturer_rrp_source);
    if(rrp)return rrp;
    return 'https://pricespy.co.uk/';
  }

  function addHeaderComparison(card,p){
    const title=card.querySelector('.catalog-accordion-title');
    if(!title||title.querySelector('.catalog-online-comparison-header'))return;
    const a=document.createElement('a');
    a.className='catalog-online-comparison-header';
    a.href=bestUrl(p);a.target='_blank';a.rel='noopener noreferrer';
    a.textContent='ONLINE COMPARISON ↗';
    a.addEventListener('click',e=>e.stopPropagation());
    title.appendChild(a);
  }

  function addComparison(card,p){
    if(!p)return;
    const panel=card.querySelector('.catalog-accordion-panel');
    if(!panel)return;
    const actions=panel.querySelector('.catalog-accordion-actions');
    if(!actions||actions.querySelector('.catalog-online-comparison'))return;
    const a=document.createElement('a');
    a.className='btn btn-secondary catalog-online-comparison';
    a.href=bestUrl(p);a.target='_blank';a.rel='noopener noreferrer';
    a.textContent='ONLINE COMPARISON ↗';
    actions.appendChild(a);
  }

  function patch(){
    styles();
    document.querySelectorAll('#catalog-list .catalog-accordion-card').forEach(card=>{
      const p=productsById.get(card.dataset.productId);
      if(!p)return;
      addHeaderComparison(card,p);
      addComparison(card,p);
      const title=card.querySelector('.catalog-accordion-title p');
      if(title){
        const existing=title.textContent||'';
        const rest=existing.replace(/^RRP\s+[^·]+\s*·\s*/,'');
        title.textContent=`RRP ${money(p.manufacturer_rrp,p.manufacturer_rrp_currency||'GBP')}${rest?' · '+rest:''}`;
      }
    });
  }

  async function init(){
    try{await loadData();patch();
      const list=document.getElementById('catalog-list');
      if(list)new MutationObserver(()=>patch()).observe(list,{childList:true,subtree:true});
    }catch(e){console.error('Catalogue comparison enhancement failed',e);}
  }
  document.addEventListener('DOMContentLoaded',init);
})();
