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

function evidenceKey(r){
  return [
    String(r.retailer||'').trim().toLowerCase(),
    String(r.price_type||'').trim().toLowerCase(),
    String(r.condition||'').trim().toLowerCase(),
    r.buy_price??'',r.sell_price??'',
    safe(r.source_url||'').replace(/\/$/,'').toLowerCase()
  ].join('|');
}
function dedupeEvidenceRows(rows){
  const seen=new Set();
  return (rows||[]).filter(r=>{const key=evidenceKey(r);if(seen.has(key))return false;seen.add(key);return true;});
}

function productLabel(p){
  return [p.manufacturer,p.model,p.package_name].filter(Boolean).join(' ')||'Unnamed product';
}

function searchHaystack(p){
  return [p.manufacturer,p.model,p.package_name,p.package_key,p.main_category,p.product_type,p.category]
    .filter(Boolean).join(' ').toLowerCase();
}
function productMatchesSearch(p,query){
  const q=String(query||'').trim().toLowerCase();
  if(!q)return false;
  const hay=searchHaystack(p);
  const tokens=q.split(/\s+/).filter(Boolean);
  return tokens.every(token=>hay.includes(token));
}
function syncFiltersToProduct(p){
  const main=String(p.main_category||p.category||'');
  const type=String(p.product_type||p.category||'');
  const manufacturer=String(p.manufacturer||'');
  $('pricing-main-category').value=main;
  populateTypes();
  $('pricing-category').value=type;
  populateManufacturers();
  $('pricing-manufacturer').value=manufacturer;
  populateProducts();
  $('pricing-product').value=String(p.id);
}
function runProductSearch(){
  const query=$('pricing-search').value.trim();
  const resultsBox=$('pricing-search-results');
  const select=$('pricing-search-select');
  const help=$('pricing-search-help');
  resetDetail();
  if(!query){
    resultsBox.hidden=true;
    select.innerHTML='';
    help.textContent='Search the live catalogue directly, or use the filters below.';
    return;
  }
  const rows=products.filter(p=>productMatchesSearch(p,query)).sort((a,b)=>productLabel(a).localeCompare(productLabel(b)));
  resultsBox.hidden=false;
  if(!rows.length){
    select.innerHTML='<option value="">No relevant products found</option>';
    select.disabled=true;
    help.textContent='No active catalogue products matched “'+query+'”. Try fewer words or search by manufacturer, model or package.';
    return;
  }
  select.disabled=false;
  select.innerHTML='<option value="">-- Select a relevant product --</option>'+rows.map(p=>
    '<option value="'+esc(p.id)+'">'+esc(productLabel(p))+'</option>'
  ).join('');
  help.textContent=rows.length+' relevant product'+(rows.length===1?'':'s')+' found. Select one to open its market evidence.';
}
function resetDetail(){
  $('pricing-detail-panel').hidden=true;
  $('pricing-evidence-body').innerHTML='';
  $('pricing-no-evidence').hidden=true;
}

function searchText(p){
  return [p.manufacturer,p.model,p.package_name,p.package_key,p.category,p.main_category,p.product_type]
    .filter(Boolean).join(' ').toLowerCase();
}

function runProductSearch(query){
  const q=String(query||'').trim().toLowerCase();
  const box=$('pricing-search-results');
  const select=$('pricing-search-select');
  const help=$('pricing-search-help');

  if(!q){
    box.classList.remove('show');
    select.innerHTML='';
    help.textContent='Search the catalogue directly, or use the filters below.';
    return;
  }

  const terms=q.split(/\s+/).filter(Boolean);
  const ranked=products.map(p=>{
    const text=searchText(p);
    let score=0;
    if(text===q) score+=1000;
    if(String(productLabel(p)).toLowerCase()===q) score+=900;
    if(text.includes(q)) score+=500;
    for(const term of terms) if(text.includes(term)) score+=50;
    return {p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||productLabel(a.p).localeCompare(productLabel(b.p))).slice(0,20);

  if(!ranked.length){
    box.classList.remove('show');
    select.innerHTML='';
    help.textContent='No relevant products found. Try a model, manufacturer or fewer words.';
    return;
  }

  select.innerHTML=ranked.map(({p})=>
    '<option value="'+esc(p.id)+'">'+esc(productLabel(p))+'</option>'
  ).join('');
  box.classList.add('show');
  help.textContent=ranked.length+' relevant product'+(ranked.length===1?'':'s')+' found. Select one to open it.';
}

function selectSearchedProduct(id){
  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;

  $('pricing-main-category').value=String(p.main_category||p.category||'');
  populateTypes();
  $('pricing-category').value=String(p.product_type||p.category||'');
  populateManufacturers();
  $('pricing-manufacturer').value=String(p.manufacturer||'');
  populateProducts();
  $('pricing-product').value=String(p.id);
  openProduct(p.id);

  $('pricing-search-input').value=productLabel(p);
  $('pricing-search-results').classList.remove('show');
  $('pricing-search-help').textContent='Showing '+productLabel(p)+'. Filters below have been matched automatically.';
}


function populateMainCategories(){
  const select=$('pricing-main-category');
  const values=[...new Set(products.map(p=>String(p.main_category||p.category||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  select.innerHTML='<option value="">-- Select category --</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
}
function populateTypes(){
  const main=$('pricing-main-category').value;
  const type=$('pricing-category');
  type.value='';
  if(!main){ type.disabled=true; type.innerHTML='<option value="">-- Select category first --</option>'; return; }
  const values=[...new Set(products.filter(p=>String(p.main_category||p.category||'')===main).map(p=>String(p.product_type||p.category||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  type.disabled=!values.length;
  type.innerHTML='<option value="">-- Select type --</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
}
function populateManufacturers(){
  const main=$('pricing-main-category').value;
  const type=$('pricing-category').value;
  const mf=$('pricing-manufacturer');
  if(!main||!type){ mf.disabled=true; mf.innerHTML='<option value="">-- Select type first --</option>'; return; }
  const values=[...new Set(products.filter(p=>String(p.main_category||p.category||'')===main && String(p.product_type||p.category||'')===type).map(p=>String(p.manufacturer||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  mf.disabled=!values.length;
  mf.innerHTML='<option value="">-- Select manufacturer --</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
}

function populateProducts(){
  const mainCategory=$('pricing-main-category').value;
  const manufacturer=$('pricing-manufacturer').value;
  const category=$('pricing-category').value;
  const select=$('pricing-product');
  const help=$('pricing-product-help');

  select.value='';
  resetDetail();

  if(!mainCategory||!category||!manufacturer){
    select.disabled=true;
    select.innerHTML='<option value="">-- Complete the filters first --</option>';
    help.textContent='Select category, type and manufacturer.';
    return;
  }

  const rows=products.filter(p=>
    String(p.main_category||p.category||'')===mainCategory &&
    String(p.product_type||p.category||'')===category &&
    String(p.manufacturer||'')===manufacturer
  );

  select.disabled=!rows.length;
  select.innerHTML=rows.length
    ? '<option value="">-- Select product --</option>'+rows.map(p=>
        '<option value="'+esc(p.id)+'">'+esc(productLabel(p))+'</option>'
      ).join('')
    : '<option value="">No products found</option>';

  help.textContent=rows.length
    ? rows.length+' product'+(rows.length===1?'':'s')+' available for '+manufacturer+' · '+category+'.'
    : 'No products are available for this manufacturer and type.';
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

  const e=dedupeEvidenceRows(data||[]);
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

async function init(){
  if(!sb())return setTimeout(init,100);

  const {data,error}=await sb()
    .from('quote_catalog_products')
    .select('id,category,main_category,product_type,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active')
    .eq('active',true)
    .order('manufacturer')
    .order('category')
    .order('model')
    .order('package_name');

  if(error){
    $('pricing-product').innerHTML='<option value="">Unable to load products</option>';
    $('pricing-product-help').textContent=error.message;
    return;
  }

  products=data||[];
  populateMainCategories();
  populateTypes();
  populateManufacturers();
  populateProducts();

  $('pricing-main-category').addEventListener('change',()=>{
    populateTypes(); populateManufacturers(); populateProducts();
  });
  $('pricing-category').addEventListener('change',()=>{
    populateManufacturers(); populateProducts();
  });
  $('pricing-manufacturer').addEventListener('change',populateProducts);
  $('pricing-product').addEventListener('change',e=>openProduct(e.target.value));

  $('pricing-search-button').addEventListener('click',runProductSearch);
  $('pricing-search').addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();runProductSearch();}
  });
  $('pricing-search-select').addEventListener('change',e=>{
    const p=products.find(x=>String(x.id)===String(e.target.value));
    if(!p)return;
    syncFiltersToProduct(p);
    openProduct(p.id);
  });
}

document.addEventListener('DOMContentLoaded',init);