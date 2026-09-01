const auth=window.actionBuyerAuth;
const sb=()=>auth?.supabase;
const $=id=>document.getElementById(id);
let products=[];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function money(v,c='GBP'){
  if(v===null||v===undefined||v==='')return'—';
  try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:String(c||'GBP').toUpperCase()}).format(Number(v));}
  catch{return Number(v).toFixed(2)+' '+c;}
}

function safe(v){
  try{
    const u=new URL(v);
    return /^https?:$/.test(u.protocol)?u.href:'';
  }catch{return'';}
}

function productLabel(p){
  return [p.manufacturer,p.model,p.package_name].filter(Boolean).join(' ')||'Unnamed product';
}

function populateFilters(){
  const mf=$('pricing-manufacturer');
  const cf=$('pricing-category');
  const currentManufacturer=mf.value;
  const currentCategory=cf.value;

  const manufacturers=[...new Set(products.map(p=>p.manufacturer).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const categories=[...new Set(products.map(p=>p.category).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));

  mf.innerHTML='<option value="">All manufacturers</option>'+manufacturers.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
  cf.innerHTML='<option value="">All types</option>'+categories.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');

  if(manufacturers.includes(currentManufacturer))mf.value=currentManufacturer;
  if(categories.includes(currentCategory))cf.value=currentCategory;
}

function filteredProducts(){
  const q=$('pricing-search').value.trim().toLowerCase();
  const m=$('pricing-manufacturer').value;
  const c=$('pricing-category').value;

  return products.filter(p=>{
    const searchable=[p.manufacturer,p.model,p.package_name,p.package_key,p.category].join(' ').toLowerCase();
    return (!q||searchable.includes(q))&&(!m||p.manufacturer===m)&&(!c||p.category===c);
  });
}

function renderProductDropdown(){
  const select=$('pricing-product');
  const help=$('pricing-product-help');
  const previous=select.value;
  const rows=filteredProducts();

  if(!rows.length){
    select.disabled=true;
    select.innerHTML='<option value="">No matching products found</option>';
    help.textContent='Change the search or filters to find another product.';
    $('pricing-detail-panel').hidden=true;
    return;
  }

  select.disabled=false;
  select.innerHTML='<option value="">-- Select a product --</option>'+rows.map(p=>
    '<option value="'+esc(p.id)+'">'+esc(productLabel(p))+(p.category?' — '+esc(p.category):'')+'</option>'
  ).join('');

  if(rows.some(p=>String(p.id)===String(previous)))select.value=previous;
  help.textContent=rows.length+' matching product'+(rows.length===1?'':'s')+' available. Select one to open its pricing evidence.';
}

async function openProduct(id){
  if(!id)return;

  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;

  $('pricing-detail-panel').hidden=false;
  $('pricing-product-title').textContent=productLabel(p);
  $('pricing-product-meta').textContent=[p.category,p.package_key].filter(Boolean).join(' · ');
  $('pricing-evidence-body').innerHTML='<tr><td colspan="11">Loading...</td></tr>';
  $('pricing-detail-panel').scrollIntoView({behavior:'smooth',block:'start'});

  const {data,error}=await sb()
    .from('quote_catalog_retailer_prices')
    .select('retailer,price_type,condition,price_currency,evidence_region,sell_price,buy_price,availability_status,source_url,notes,checked_at')
    .eq('catalog_product_id',id)
    .order('checked_at',{ascending:false});

  if(error){
    $('pricing-evidence-body').innerHTML='<tr><td colspan="11">'+esc(error.message)+'</td></tr>';
    return;
  }

  const e=data||[];
  $('pricing-no-evidence').hidden=!!e.length;

  $('pricing-condition-guide').innerHTML=
    '<div class="uk-market-reference-grid">'+
    [
      ['Factory Sealed / Unopened',p.factory_sealed_price],
      ['Opened but Unused',p.opened_unused_price],
      ['Excellent',p.excellent_price],
      ['Good',p.good_price],
      ['Fair',p.fair_price]
    ].map(x=>
      '<div class="uk-market-stat"><strong>'+money(x[1])+'</strong><span>'+x[0]+' — purchasing reference</span></div>'
    ).join('')+
    '</div>';

  $('pricing-evidence-body').innerHTML=e.map(r=>{
    const u=safe(r.source_url);
    return '<tr>'+
      '<td>'+esc(r.retailer||'—')+'</td>'+
      '<td>'+esc(r.price_type||'—').replaceAll('_',' ')+'</td>'+
      '<td>'+esc(r.condition||'—')+'</td>'+
      '<td>'+esc(r.price_currency||'—')+'</td>'+
      '<td>'+esc(r.evidence_region||'—')+'</td>'+
      '<td>'+money(r.sell_price,r.price_currency)+'</td>'+
      '<td>'+money(r.buy_price,r.price_currency)+'</td>'+
      '<td>'+esc(r.availability_status||'—').replaceAll('_',' ')+'</td>'+
      '<td>'+(u?'<a class="retailer-link" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>':'—')+'</td>'+
      '<td>'+esc(r.notes||'—')+'</td>'+
      '<td>'+esc(r.checked_at?new Date(r.checked_at).toLocaleString('en-GB'):'—')+'</td>'+
    '</tr>';
  }).join('');
}

function refreshDropdown(){
  renderProductDropdown();
}

async function init(){
  if(!sb())return setTimeout(init,100);

  const {data,error}=await sb()
    .from('quote_catalog_products')
    .select('id,category,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active')
    .eq('active',true)
    .order('manufacturer')
    .order('model');

  if(error){
    $('pricing-product').innerHTML='<option value="">Unable to load products</option>';
    $('pricing-product-help').textContent=error.message;
    return;
  }

  products=data||[];
  populateFilters();
  renderProductDropdown();

  $('pricing-search').addEventListener('input',refreshDropdown);
  $('pricing-manufacturer').addEventListener('change',refreshDropdown);
  $('pricing-category').addEventListener('change',refreshDropdown);
  $('pricing-product').addEventListener('change',e=>openProduct(e.target.value));
}

document.addEventListener('DOMContentLoaded',init);