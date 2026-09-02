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

function resetDetail(){
  $('pricing-detail-panel').hidden=true;
  $('pricing-evidence-body').innerHTML='';
  $('pricing-no-evidence').hidden=true;
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
}

document.addEventListener('DOMContentLoaded',init);