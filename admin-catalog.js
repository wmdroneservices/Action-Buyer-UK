const auth=window.actionBuyerAuth;
const sb=()=>auth?.supabase;
const $=id=>document.getElementById(id);
let products=[];
let retailerRows=[];
let currentPage=1;
const PAGE_SIZE=50;

function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function money(v){return v===null||v===undefined||v===''?'—':`£${Number(v).toFixed(2)}`;}
function val(id){return $(id)?.value?.trim()||'';}
function num(id){const v=val(id);return v===''?null:Number(v);}
function setVal(id,v){if($(id))$(id).value=v??'';}
function safeUrl(v){try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function checkedLabel(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Europe/London'})+' BST';}

function renderUkMarketReference(){
  const box=$('uk-market-reference-grid');if(!box)return;
  const uk=retailerRows.filter(r=>String(r.price_currency||'').toUpperCase()==='GBP'&&String(r.evidence_region||'').toUpperCase()==='UK');
  const newRows=uk.filter(r=>['new','new_sale'].includes(String(r.price_type||'').toLowerCase()));
  const usedRows=uk.filter(r=>!['new','new_sale'].includes(String(r.price_type||'').toLowerCase()));
  const prices=newRows.map(r=>Number(r.sell_price)).filter(Number.isFinite);
  const cards=[];
  cards.push(`<div class="uk-market-stat"><strong>${newRows.length}</strong><span>UK NEW pricing evidence records</span></div>`);
  cards.push(`<div class="uk-market-stat"><strong>${prices.length?money(Math.min(...prices)):'—'}</strong><span>Lowest UK NEW selling price</span></div>`);
  cards.push(`<div class="uk-market-stat"><strong>${prices.length?money(Math.max(...prices)):'—'}</strong><span>Highest UK NEW selling price</span></div>`);
  cards.push(`<div class="uk-market-stat"><strong>${usedRows.length}</strong><span>UK used / other evidence — reference only</span></div>`);
  box.innerHTML=cards.join('');
}

function renderRetailers(){
  const body=$('retailer-prices-body');if(!body)return;renderUkMarketReference();
  if(!retailerRows.length){body.innerHTML='<tr><td colspan="13">No online comparison evidence recorded yet. Add UK and overseas evidence where it is genuinely useful. Keep direct source links and timestamps.</td></tr>';return;}
  body.innerHTML=retailerRows.map((r,i)=>{const url=safeUrl(r.source_url);return `<tr data-index="${i}"${r.id?` data-id="${esc(r.id)}"`:''}>
    <td><input class="retailer" value="${esc(r.retailer)}" placeholder="DJI / Amazon UK / MPB / CeX"></td>
    <td><select class="retailer-type"><option value="new" ${r.price_type==='new'?'selected':''}>New</option><option value="new_sale" ${r.price_type==='new_sale'?'selected':''}>New — Sale / Offer</option><option value="refurbished" ${r.price_type==='refurbished'?'selected':''}>Refurbished</option><option value="used" ${r.price_type==='used'?'selected':''}>Used</option><option value="competitor_buying" ${r.price_type==='competitor_buying'?'selected':''}>Competitor Buying</option><option value="completed_sale" ${r.price_type==='completed_sale'?'selected':''}>Completed Sale</option><option value="market" ${r.price_type==='market'?'selected':''}>Market Reference</option></select></td>
    <td><input class="retailer-condition" value="${esc(r.condition)}" placeholder="New / Opened / Excellent / Good / Fair"></td>
    <td><input class="retailer-currency" value="${esc(r.price_currency||'')}" placeholder="GBP / USD / EUR" maxlength="3"></td>
    <td><input class="retailer-region" value="${esc(r.evidence_region||'')}" placeholder="UK / USA / Germany"></td>
    <td><input class="retailer-sell" type="number" min="0" step="0.01" value="${r.sell_price??''}" placeholder="—"></td>
    <td><input class="retailer-buy" type="number" min="0" step="0.01" value="${r.buy_price??''}" placeholder="—"></td>
    <td><select class="retailer-stock"><option value="in_stock" ${r.availability_status==='in_stock'?'selected':''}>In stock</option><option value="out_of_stock" ${r.availability_status==='out_of_stock'?'selected':''}>Out of stock</option><option value="unknown" ${r.availability_status==='unknown'?'selected':''}>Unknown</option></select></td>
    <td><input class="retailer-method" value="${esc(r.buy_method)}" placeholder="Cash / voucher / buying offer"></td>
    <td><input class="retailer-source source-input" type="url" value="${esc(r.source_url)}" placeholder="https://..."><br>${url?`<a class="retailer-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>`:'<span class="retailer-link disabled">NO SOURCE LINK</span>'}</td>
    <td><input class="retailer-notes" value="${esc(r.notes)}" placeholder="Sale/offer, package, evidence"></td>
    <td class="retailer-checked">${checkedLabel(r.checked_at)}</td>
    <td><button type="button" class="btn btn-secondary remove-retailer">REMOVE</button></td>
  </tr>`;}).join('');
}

function readRetailers(){
  retailerRows=Array.from(document.querySelectorAll('#retailer-prices-body tr[data-index]')).map(tr=>({
    id:tr.dataset.id||null,
    retailer:tr.querySelector('.retailer')?.value.trim()||'',
    price_type:tr.querySelector('.retailer-type')?.value||'market',
    condition:tr.querySelector('.retailer-condition')?.value.trim()||'',
    price_currency:tr.querySelector('.retailer-currency')?.value.trim().toUpperCase()||'',
    evidence_region:tr.querySelector('.retailer-region')?.value.trim().toUpperCase()||'',
    buy_price:tr.querySelector('.retailer-buy')?.value===''?null:Number(tr.querySelector('.retailer-buy')?.value),
    sell_price:tr.querySelector('.retailer-sell')?.value===''?null:Number(tr.querySelector('.retailer-sell')?.value),
    availability_status:tr.querySelector('.retailer-stock')?.value||'unknown',
    buy_method:tr.querySelector('.retailer-method')?.value.trim()||'',
    source_url:tr.querySelector('.retailer-source')?.value.trim()||'',
    notes:tr.querySelector('.retailer-notes')?.value.trim()||'',
    checked_at:tr.dataset.checkedAt||null
  }));
}

function clearForm(){
  $('catalog-form')?.reset();setVal('product-id','');retailerRows=[];renderRetailers();$('catalog-message').textContent='';$('catalog-message').className='form-message';if($('active'))$('active').checked=true;
}

function loadProduct(p){
  setVal('product-id',p.id);setVal('category',p.category);setVal('manufacturer',p.manufacturer);setVal('model',p.model);setVal('package-key',p.package_key);setVal('package-name',p.package_name);setVal('factory-sealed',p.factory_sealed_price);setVal('opened-unused',p.opened_unused_price);setVal('excellent',p.excellent_price);setVal('good',p.good_price);setVal('fair',p.fair_price);setVal('notes',p.notes||'');if($('active'))$('active').checked=!!p.active;
  retailerRows=[];renderRetailers();
  sb().from('quote_catalog_retailer_prices').select('id,retailer,price_type,condition,buy_price,sell_price,availability_status,buy_method,source_url,notes,checked_at,price_currency,price_region,evidence_region').eq('catalog_product_id',p.id).order('retailer').order('price_type').order('condition').order('sell_price').then(({data,error})=>{if(error){showMessage(error.message,true);return;}retailerRows=data||[];renderRetailers();Array.from(document.querySelectorAll('#retailer-prices-body tr[data-index]')).forEach((tr,i)=>{if(retailerRows[i]?.id)tr.dataset.id=retailerRows[i].id;if(retailerRows[i]?.checked_at)tr.dataset.checkedAt=retailerRows[i].checked_at;});});
  window.scrollTo({top:0,behavior:'smooth'});
}

function showMessage(text,error=false){const el=$('catalog-message');if(!el)return;el.textContent=text;el.className=`form-message ${error?'error':'success'}`;}
function populateFilters(){const manufacturer=$('manufacturer-filter'),category=$('category-filter');if(!manufacturer||!category)return;const currentManufacturer=manufacturer.value,currentCategory=category.value;const manufacturers=[...new Set(products.map(p=>String(p.manufacturer||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));const categories=[...new Set(products.map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));manufacturer.innerHTML='<option value="">All manufacturers</option>'+manufacturers.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');category.innerHTML='<option value="">All types</option>'+categories.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(manufacturers.includes(currentManufacturer))manufacturer.value=currentManufacturer;if(categories.includes(currentCategory))category.value=currentCategory;}

function filteredProducts(){
  const q=val('search').toLowerCase(),manufacturer=val('manufacturer-filter').toLowerCase(),category=val('category-filter').toLowerCase(),status=val('status-filter').toLowerCase();
  return products.filter(p=>{const textMatch=!q||[p.category,p.manufacturer,p.model,p.package_key,p.package_name].some(v=>String(v||'').toLowerCase().includes(q));const manufacturerMatch=!manufacturer||String(p.manufacturer||'').toLowerCase()===manufacturer;const categoryMatch=!category||String(p.category||'').toLowerCase()===category;const statusMatch=!status||(status==='active'?!!p.active:!p.active);return textMatch&&manufacturerMatch&&categoryMatch&&statusMatch;});
}
function ensurePagination(){let el=$('catalog-pagination');if(!el){el=document.createElement('div');el.id='catalog-pagination';const list=$('catalog-list');list?.parentNode?.insertBefore(el,list.nextSibling);}return el;}
function renderPagination(total){const el=ensurePagination();if(!el)return;const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));if(currentPage>pages)currentPage=pages;if(pages<=1){el.innerHTML='';el.style.display='none';return;}const start=(currentPage-1)*PAGE_SIZE+1,end=Math.min(currentPage*PAGE_SIZE,total);el.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin:1rem 0';el.innerHTML=`<span>Showing ${start}–${end} of ${total} products</span><span style="display:flex;gap:.5rem;align-items:center"><button type="button" class="btn btn-secondary catalog-page-prev" ${currentPage===1?'disabled':''}>PREVIOUS</button><strong>Page ${currentPage} of ${pages}</strong><button type="button" class="btn btn-secondary catalog-page-next" ${currentPage===pages?'disabled':''}>NEXT</button></span>`;}
function renderList(){populateFilters();const list=$('catalog-list');if(!list)return;const rows=filteredProducts();const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));if(currentPage>pages)currentPage=pages;if(!rows.length){list.innerHTML='<div class="empty-account"><h3>No products found</h3><p>No catalogue products match the selected filters.</p></div>';renderPagination(0);return;}const pageRows=rows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);list.innerHTML=`<div class="valuation-list">${pageRows.map(p=>`<div class="valuation-card"><div><div class="valuation-ref">${esc(p.manufacturer)} · ${esc(p.category||'')}</div><h3>${esc(p.manufacturer)} ${esc(p.model)} — ${esc(p.package_name||p.package_key)}</h3><p>Online comparison — · Sealed ${money(p.factory_sealed_price)} · Unused ${money(p.opened_unused_price)} · Excellent ${money(p.excellent_price)} · Good ${money(p.good_price)} · Fair ${money(p.fair_price)}</p></div><div class="valuation-meta"><span class="status-badge">${p.active?'Active':'Inactive'}</span><button type="button" class="btn btn-secondary edit-product" data-id="${esc(p.id)}">EDIT</button></div></div>`).join('')}</div>`;renderPagination(rows.length);}
function resetToFirstPage(){currentPage=1;renderList();}
function clearFilters(){setVal('search','');setVal('manufacturer-filter','');setVal('category-filter','');setVal('status-filter','');resetToFirstPage();}

async function load(){
  if(!auth||!sb()){showMessage('Authentication system unavailable.',true);return;}
  try{const session=await auth.getSession();if(!session){location.href='login.html?return=admin-catalog.html';return;}const {data:staff,error:staffError}=await sb().from('staff_users').select('user_id').eq('user_id',session.user.id).maybeSingle();if(staffError)throw staffError;if(!staff){document.body.innerHTML='<main class="account-page"><div class="container"><section class="account-panel"><h1>Staff access required</h1><p>This page is restricted to staff accounts.</p></section></div></main>';return;}let allProducts=[],from=0;const pageSize=1000;while(true){const {data,error}=await sb().from('quote_catalog_products').select('id,category,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,active,notes,updated_at').range(from,from+pageSize-1).order('manufacturer').order('model').order('package_name');if(error)throw error;allProducts.push(...(data||[]));if(!data||data.length<pageSize)break;from+=pageSize;}products=allProducts;currentPage=1;populateFilters();renderList();}catch(e){console.error(e);$('catalog-list').textContent='Unable to load the catalogue.';showMessage(e.message||String(e),true);}}

$('catalog-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const session=await auth.getSession();if(!session){location.href='login.html?return=admin-catalog.html';return;}const payload={category:val('category'),manufacturer:val('manufacturer'),model:val('model'),package_key:val('package-key'),package_name:val('package-name'),factory_sealed_price:num('factory-sealed'),opened_unused_price:num('opened-unused'),excellent_price:num('excellent'),good_price:num('good'),fair_price:num('fair'),active:$('active')?.checked!==false,notes:val('notes'),updated_at:new Date().toISOString()};if(!payload.category||!payload.manufacturer||!payload.model||!payload.package_key||!payload.package_name){showMessage('Category, manufacturer, model, package key and package name are required for a new product.',true);return;}const id=val('product-id');let saved;if(id){const r=await sb().from('quote_catalog_products').update(payload).eq('id',id).select().single();if(r.error)throw r.error;saved=r.data;}else{const r=await sb().from('quote_catalog_products').insert(payload).select().single();if(r.error)throw r.error;saved=r.data;}readRetailers();if(saved?.id){const existing=await sb().from('quote_catalog_retailer_prices').select('id').eq('catalog_product_id',saved.id);if(existing.error)throw existing.error;const keep=[];for(const r of retailerRows){if(!r.retailer)continue;const row={catalog_product_id:saved.id,retailer:r.retailer,price_type:r.price_type||'market',condition:r.condition,price_currency:r.price_currency||null,evidence_region:r.evidence_region||null,buy_price:r.buy_price,sell_price:r.sell_price,availability_status:r.availability_status||'unknown',buy_method:r.buy_method,source_url:r.source_url,notes:r.notes,checked_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(r.id){const u=await sb().from('quote_catalog_retailer_prices').update(row).eq('id',r.id);if(u.error)throw u.error;keep.push(r.id);}else{const ins=await sb().from('quote_catalog_retailer_prices').insert(row).select('id').single();if(ins.error)throw ins.error;keep.push(ins.data.id);}}const remove=(existing.data||[]).map(x=>x.id).filter(x=>!keep.includes(x));if(remove.length){const d=await sb().from('quote_catalog_retailer_prices').delete().in('id',remove);if(d.error)throw d.error;}}showMessage('Product and online comparison evidence saved.');await load();const fresh=products.find(p=>p.id===saved.id);if(fresh)loadProduct(fresh);}catch(e){console.error(e);showMessage(e.message||String(e),true);}});

document.addEventListener('click',e=>{const edit=e.target.closest('.edit-product');if(edit){const p=products.find(x=>x.id===edit.dataset.id);if(p)loadProduct(p);}if(e.target.closest('#clear-form'))clearForm();if(e.target.closest('#clear-filters'))clearFilters();if(e.target.closest('#add-retailer-price')){readRetailers();retailerRows.push({retailer:'',price_type:'new',condition:'New',price_currency:'GBP',evidence_region:'UK',buy_price:null,sell_price:null,availability_status:'in_stock',buy_method:'',source_url:'',notes:'',checked_at:null});renderRetailers();}if(e.target.closest('.remove-retailer')){readRetailers();const tr=e.target.closest('tr');retailerRows.splice(Number(tr.dataset.index),1);renderRetailers();}if(e.target.closest('.catalog-page-prev')){currentPage=Math.max(1,currentPage-1);renderList();window.scrollTo({top:document.getElementById('catalog-list')?.offsetTop||0,behavior:'smooth'});}if(e.target.closest('.catalog-page-next')){const total=filteredProducts().length;const pages=Math.ceil(total/PAGE_SIZE);currentPage=Math.min(pages,currentPage+1);renderList();window.scrollTo({top:document.getElementById('catalog-list')?.offsetTop||0,behavior:'smooth'});}});
$('search')?.addEventListener('input',resetToFirstPage);$('manufacturer-filter')?.addEventListener('change',resetToFirstPage);$('category-filter')?.addEventListener('change',resetToFirstPage);$('status-filter')?.addEventListener('change',resetToFirstPage);document.addEventListener('DOMContentLoaded',load,{once:true});