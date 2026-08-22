const auth=window.actionBuyerAuth;
const sb=()=>auth?.supabase;
const $=id=>document.getElementById(id);
let products=[];
let retailerRows=[];

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(v){return v===null||v===undefined||v===''?'—':`£${Number(v).toFixed(2)}`;}
function val(id){return $(id)?.value?.trim()||'';}
function num(id){const v=val(id);return v===''?null:Number(v);}
function setVal(id,v){if($(id))$(id).value=v??'';}

function renderRetailers(){
  const body=$('retailer-prices-body');
  if(!body)return;
  if(!retailerRows.length){body.innerHTML='<tr><td colspan="7">No retailer comparison data recorded.</td></tr>';return;}
  body.innerHTML=retailerRows.map((r,i)=>`<tr data-index="${i}">
    <td><input class="retailer" value="${esc(r.retailer)}"></td>
    <td><input class="retailer-condition" value="${esc(r.condition)}"></td>
    <td><input class="retailer-buy" type="number" min="0" step="0.01" value="${r.buy_price??''}"></td>
    <td><input class="retailer-sell" type="number" min="0" step="0.01" value="${r.sell_price??''}"></td>
    <td><input class="retailer-method" value="${esc(r.buy_method)}"></td>
    <td><input class="retailer-source" type="url" value="${esc(r.source_url)}"></td>
    <td><button type="button" class="btn btn-secondary remove-retailer">REMOVE</button></td>
  </tr>`).join('');
}

function readRetailers(){
  retailerRows=Array.from(document.querySelectorAll('#retailer-prices-body tr[data-index]')).map(tr=>({
    id:tr.dataset.id||null,
    retailer:tr.querySelector('.retailer')?.value.trim()||'',
    condition:tr.querySelector('.retailer-condition')?.value.trim()||'',
    buy_price:tr.querySelector('.retailer-buy')?.value===''?null:Number(tr.querySelector('.retailer-buy')?.value),
    sell_price:tr.querySelector('.retailer-sell')?.value===''?null:Number(tr.querySelector('.retailer-sell')?.value),
    buy_method:tr.querySelector('.retailer-method')?.value.trim()||'',
    source_url:tr.querySelector('.retailer-source')?.value.trim()||''
  }));
}

function clearForm(){
  $('catalog-form')?.reset();
  setVal('product-id','');
  retailerRows=[];
  renderRetailers();
  $('catalog-message').textContent='';
  $('catalog-message').className='form-message';
  if($('active'))$('active').checked=true;
}

function loadProduct(p){
  setVal('product-id',p.id);setVal('category',p.category);setVal('manufacturer',p.manufacturer);setVal('model',p.model);setVal('package-key',p.package_key);setVal('package-name',p.package_name);
  setVal('factory-sealed',p.factory_sealed_price);setVal('opened-unused',p.opened_unused_price);setVal('excellent',p.excellent_price);setVal('good',p.good_price);setVal('fair',p.fair_price);setVal('notes',p.notes||'');
  if($('active'))$('active').checked=!!p.active;
  retailerRows=[];renderRetailers();
  sb().from('quote_catalog_retailer_prices').select('id,retailer,condition,buy_price,sell_price,buy_method,source_url,notes').eq('catalog_product_id',p.id).order('retailer').order('condition').then(({data,error})=>{
    if(error){showMessage(error.message,true);return;}
    retailerRows=data||[];renderRetailers();
    Array.from(document.querySelectorAll('#retailer-prices-body tr[data-index]')).forEach((tr,i)=>{if(retailerRows[i]?.id)tr.dataset.id=retailerRows[i].id;});
  });
  window.scrollTo({top:0,behavior:'smooth'});
}

function showMessage(text,error=false){const el=$('catalog-message');if(!el)return;el.textContent=text;el.className=`form-message ${error?'error':'success'}`;}

function populateFilters(){
  const manufacturer=$('manufacturer-filter');
  const category=$('category-filter');
  if(!manufacturer||!category)return;
  const currentManufacturer=manufacturer.value;
  const currentCategory=category.value;
  const manufacturers=[...new Set(products.map(p=>String(p.manufacturer||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const categories=[...new Set(products.map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  manufacturer.innerHTML='<option value="">All manufacturers</option>'+manufacturers.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  category.innerHTML='<option value="">All types</option>'+categories.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if(manufacturers.includes(currentManufacturer))manufacturer.value=currentManufacturer;
  if(categories.includes(currentCategory))category.value=currentCategory;
}

function renderList(){
  const list=$('catalog-list');
  const q=val('search').toLowerCase();
  const manufacturer=val('manufacturer-filter').toLowerCase();
  const category=val('category-filter').toLowerCase();
  const rows=products.filter(p=>{
    const textMatch=!q||[p.category,p.manufacturer,p.model,p.package_key,p.package_name].some(v=>String(v||'').toLowerCase().includes(q));
    const manufacturerMatch=!manufacturer||String(p.manufacturer||'').toLowerCase()===manufacturer;
    const categoryMatch=!category||String(p.category||'').toLowerCase()===category;
    return textMatch&&manufacturerMatch&&categoryMatch;
  });
  if(!rows.length){list.innerHTML='<div class="empty-account"><h3>No products found</h3><p>No catalogue products match the selected filters.</p></div>';return;}
  list.innerHTML=`<div class="valuation-list">${rows.map(p=>`<div class="valuation-card"><div><div class="valuation-ref">${esc(p.manufacturer)} · ${esc(p.category||'')}</div><h3>${esc(p.manufacturer)} ${esc(p.model)} — ${esc(p.package_name||p.package_key)}</h3><p>Sealed ${money(p.factory_sealed_price)} · Unused ${money(p.opened_unused_price)} · Excellent ${money(p.excellent_price)} · Good ${money(p.good_price)} · Fair ${money(p.fair_price)}</p></div><div class="valuation-meta"><span class="status-badge">${p.active?'Active':'Inactive'}</span><button type="button" class="btn btn-secondary edit-product" data-id="${p.id}">EDIT</button></div></div>`).join('')}</div>`;
}

function clearFilters(){
  setVal('search','');
  setVal('manufacturer-filter','');
  setVal('category-filter','');
  renderList();
}

async function load(){
  if(!auth||!sb()){showMessage('Authentication system unavailable.',true);return;}
  try{
    const session=await auth.getSession();
    if(!session){location.href='login.html?return=admin-catalog.html';return;}
    const {data:staff,error:staffError}=await sb().from('staff_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(staffError)throw staffError;
    if(!staff){document.body.innerHTML='<main class="account-page"><div class="container"><section class="account-panel"><h1>Staff access required</h1><p>This page is restricted to staff accounts.</p></section></div></main>';return;}
    const {data,error}=await sb().from('quote_catalog_products').select('id,category,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active,notes,updated_at').order('manufacturer').order('model').order('package_name');
    if(error)throw error;
    products=data||[];
    populateFilters();
    renderList();
  }catch(e){console.error(e);$('catalog-list').textContent='Unable to load the catalogue.';showMessage(e.message||String(e),true);}
}

$('catalog-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    const session=await auth.getSession();if(!session){location.href='login.html?return=admin-catalog.html';return;}
    const payload={category:val('category'),manufacturer:val('manufacturer'),model:val('model'),package_key:val('package-key'),package_name:val('package-name'),factory_sealed_price:num('factory-sealed'),opened_unused_price:num('opened-unused'),excellent_price:num('excellent'),good_price:num('good'),fair_price:num('fair'),active:$('active')?.checked!==false,notes:val('notes'),updated_at:new Date().toISOString()};
    if(!payload.category||!payload.manufacturer||!payload.model||!payload.package_key||!payload.package_name){showMessage('Category, manufacturer, model, package key and package name are required for a new product.',true);return;}
    const id=val('product-id');
    let saved;
    if(id){const r=await sb().from('quote_catalog_products').update(payload).eq('id',id).select().single();if(r.error)throw r.error;saved=r.data;}
    else{const r=await sb().from('quote_catalog_products').insert(payload).select().single();if(r.error)throw r.error;saved=r.data;}
    readRetailers();
    if(saved?.id){
      const existing=await sb().from('quote_catalog_retailer_prices').select('id').eq('catalog_product_id',saved.id);if(existing.error)throw existing.error;
      const keep=[];
      for(const r of retailerRows){if(!r.retailer)continue;const row={catalog_product_id:saved.id,retailer:r.retailer,condition:r.condition,buy_price:r.buy_price,sell_price:r.sell_price,buy_method:r.buy_method,source_url:r.source_url,updated_at:new Date().toISOString()};if(r.id){const u=await sb().from('quote_catalog_retailer_prices').update(row).eq('id',r.id);if(u.error)throw u.error;keep.push(r.id);}else{const ins=await sb().from('quote_catalog_retailer_prices').insert(row).select('id').single();if(ins.error)throw ins.error;keep.push(ins.data.id);}}
      const remove=(existing.data||[]).map(x=>x.id).filter(x=>!keep.includes(x));
      if(remove.length){const d=await sb().from('quote_catalog_retailer_prices').delete().in('id',remove);if(d.error)throw d.error;}
    }
    showMessage('Product saved.');await load();const fresh=products.find(p=>p.id===saved.id);if(fresh)loadProduct(fresh);
  }catch(e){console.error(e);showMessage(e.message||String(e),true);}
});

document.addEventListener('click',e=>{
  const edit=e.target.closest('.edit-product');
  if(edit){const p=products.find(x=>x.id===edit.dataset.id);if(p)loadProduct(p);}
  if(e.target.closest('#clear-form'))clearForm();
  if(e.target.closest('#clear-filters'))clearFilters();
  if(e.target.closest('#add-retailer-price')){readRetailers();retailerRows.push({retailer:'',condition:'',buy_price:null,sell_price:null,buy_method:'',source_url:''});renderRetailers();}
  if(e.target.closest('.remove-retailer')){readRetailers();const tr=e.target.closest('tr');retailerRows.splice(Number(tr.dataset.index),1);renderRetailers();}
});

$('search')?.addEventListener('input',renderList);
$('manufacturer-filter')?.addEventListener('change',renderList);
$('category-filter')?.addEventListener('change',renderList);
document.addEventListener('DOMContentLoaded',load);