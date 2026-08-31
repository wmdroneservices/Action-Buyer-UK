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
    `;document.head.appendChild(s);
  }

  async function loadData(){
    if(!S())return;
    const [p,r]=await Promise.all([
      S().from('quote_catalog_products').select('id,manufacturer,model,package_name,manufacturer_rrp,manufacturer_rrp_currency,manufacturer_rrp_source'),
      S().from('quote_catalog_retailer_prices').select('catalog_product_id,retailer,source_url,checked_at').not('source_url','is',null)
    ]);
    if(!p.error)(p.data||[]).forEach(x=>productsById.set(x.id,x));
    if(!r.error)(r.data||[]).forEach(x=>{const u=safeUrl(x.source_url);if(!u)return;if(!rowsByProduct.has(x.catalog_product_id))rowsByProduct.set(x.catalog_product_id,[]);rowsByProduct.get(x.catalog_product_id).push(x);});
  }

  function bestUrl(p){
    const manufacturer=String(p.manufacturer||'').trim().toLowerCase();
    const rows=rowsByProduct.get(p.id)||[];
    if(manufacturer==='akaso'){
      // Prefer the specific PriceSpy comparison page when one has been
      // recorded; otherwise use the verified AKASO PriceSpy manufacturer page.
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
