/* GearCashOut automatic catalogue block pricing. */
(function(){
'use strict';

const auth=()=>window.actionBuyerAuth;
const sb=()=>auth()?.supabase;
const $=id=>document.getElementById(id);

let products=[];
let previewRows=[];
let savedRules=[];
let savedRuleId=null;

const money=v=>v==null||v===''?'—':Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=id=>$(id)?.value?.trim()||'';
const num=id=>{const n=Number($(id)?.value);return Number.isFinite(n)?n:0;};
const nullable=id=>val(id)||null;

function msg(text,error=false){
  const el=$('pricing-message');
  if(!el)return;
  el.textContent=text;
  el.className='pricing-message show '+(error?'error':'success');
}

async function requireStaff(){
  const session=await auth().getSession();
  if(!session){location.href='login.html?return=admin-automatic-pricing.html';return false;}
  const {data,error}=await sb().from('staff_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;
  if(!data){
    document.body.innerHTML='<main class="account-page"><div class="container"><section class="account-panel"><h1>Staff access required</h1></section></div></main>';
    return false;
  }
  return true;
}

function fill(id,values,placeholder){
  const el=$(id);
  if(!el)return;
  const current=el.value;
  const unique=[...new Set((values||[]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  el.innerHTML='<option value="">'+esc(placeholder)+'</option>'+unique.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
  if(unique.includes(current))el.value=current;
}

function refreshScopeFilters(){
  const manufacturer=val('rule-manufacturer');
  const base=manufacturer?products.filter(p=>p.manufacturer===manufacturer):products;
  fill('rule-main-category',base.map(p=>p.main_category),'All main categories');

  const main=val('rule-main-category');
  const mainRows=main?base.filter(p=>p.main_category===main):base;
  fill('rule-product-type',mainRows.map(p=>p.product_type),'All product types');

  const type=val('rule-product-type');
  const typeRows=type?mainRows.filter(p=>p.product_type===type):mainRows;
  fill('rule-category',typeRows.map(p=>p.category),'All branches');
}

function scopeProducts(){
  const manufacturer=val('rule-manufacturer');
  const main=val('rule-main-category');
  const type=val('rule-product-type');
  const category=val('rule-category');
  return products.filter(p=>
    (!manufacturer||p.manufacturer===manufacturer)&&
    (!main||p.main_category===main)&&
    (!type||p.product_type===type)&&
    (!category||p.category===category)
  );
}

function ruleLabel(rule){
  const scope=[rule.manufacturer,rule.main_category,rule.product_type,rule.category].filter(Boolean).join(' · ');
  return scope||'Unnamed pricing block';
}

async function loadRules(){
  const {data,error}=await sb().from('quote_catalog_pricing_rules')
    .select('id,manufacturer,main_category,product_type,category,sealed_percent,opened_unused_discount_percent,excellent_discount_percent,good_discount_percent,fair_discount_percent,active,created_at,updated_at')
    .order('updated_at',{ascending:false})
    .order('created_at',{ascending:false});
  if(error)throw error;
  savedRules=data||[];
  renderSavedRules();
  refreshAutomaticRuleFilter();
}

function renderSavedRules(){
  const el=$('saved-rule');
  const selected=savedRuleId||el?.value||'';
  if(!el)return;
  el.innerHTML='<option value="">Select a saved pricing block</option>'+savedRules.map(r=>'<option value="'+esc(r.id)+'">'+esc(ruleLabel(r))+'</option>').join('');
  if(selected&&savedRules.some(r=>r.id===selected))el.value=selected;
  updateSavedRuleControls();
}

function updateSavedRuleControls(){
  const id=val('saved-rule');
  const rule=savedRules.find(r=>r.id===id);
  $('load-rule').disabled=!rule;
  $('delete-rule').disabled=!rule;
  $('saved-rule-details').textContent=rule
    ?'Sealed '+rule.sealed_percent+'% · Opened/unused '+rule.opened_unused_discount_percent+'% off · Excellent '+rule.excellent_discount_percent+'% off · Good '+rule.good_discount_percent+'% off · Fair '+rule.fair_discount_percent+'% off'
    :'No saved block selected.';
}

function loadSelectedRule(){
  const rule=savedRules.find(r=>r.id===val('saved-rule'));
  if(!rule){msg('Select a saved pricing block first.',true);return;}

  savedRuleId=rule.id;
  $('rule-manufacturer').value=rule.manufacturer||'';
  refreshScopeFilters();
  $('rule-main-category').value=rule.main_category||'';
  refreshScopeFilters();
  $('rule-product-type').value=rule.product_type||'';
  refreshScopeFilters();
  $('rule-category').value=rule.category||'';

  $('sealed-percent').value=rule.sealed_percent??80;
  $('opened-discount').value=rule.opened_unused_discount_percent??5;
  $('excellent-discount').value=rule.excellent_discount_percent??15;
  $('good-discount').value=rule.good_discount_percent??25;
  $('fair-discount').value=rule.fair_discount_percent??40;

  previewRows=[];
  $('apply-rule').disabled=true;
  $('preview-body').innerHTML='<tr><td colspan="7">Block loaded. Click Preview Products to recalculate the affected products.</td></tr>';
  $('preview-text').textContent='Saved block loaded. Preview products before applying any changes.';
  msg('Saved pricing block loaded for editing.');
}

function newRule(){
  savedRuleId=null;
  $('saved-rule').value='';
  updateSavedRuleControls();

  $('rule-manufacturer').value='';
  refreshScopeFilters();
  $('rule-main-category').value='';
  $('rule-product-type').value='';
  $('rule-category').value='';

  $('sealed-percent').value=80;
  $('opened-discount').value=5;
  $('excellent-discount').value=15;
  $('good-discount').value=25;
  $('fair-discount').value=40;

  previewRows=[];
  $('apply-rule').disabled=true;
  $('preview-body').innerHTML='<tr><td colspan="7">No preview loaded.</td></tr>';
  $('preview-text').textContent='Create a new manufacturer and branch pricing block.';
  $('pricing-summary').innerHTML='';
  msg('New pricing block ready.');
}

async function deleteSelectedRule(){
  const id=val('saved-rule');
  if(!id)throw new Error('Select a saved pricing block first.');
  if(!confirm('Delete this saved pricing block? Existing product prices will not be changed.'))return;

  const {error}=await sb().from('quote_catalog_pricing_rules').delete().eq('id',id);
  if(error)throw error;

  if(savedRuleId===id)savedRuleId=null;
  await loadRules();
  newRule();
  msg('Saved pricing block deleted. Existing product prices were not changed.');
}

async function loadProducts(){
  const all=[];
  let from=0;
  const pageSize=1000;

  while(true){
    const {data,error}=await sb().from('quote_catalog_products')
      .select('id,manufacturer,main_category,product_type,category,model,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price,pricing_source,automatic_pricing_rule_id')
      .range(from,from+pageSize-1)
      .order('manufacturer')
      .order('model');
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<pageSize)break;
    from+=pageSize;
  }

  products.splice(0,products.length,...all);
  fill('rule-manufacturer',products.map(p=>p.manufacturer),'Select manufacturer');
  refreshScopeFilters();
  renderAutomaticProducts();
}

async function getComparisons(ids){
  const comparisons=new Map();
  for(let i=0;i<ids.length;i+=500){
    const batch=ids.slice(i,i+500);
    const {data,error}=await sb().from('quote_catalog_retailer_prices')
      .select('catalog_product_id,sell_price,checked_at')
      .in('catalog_product_id',batch)
      .eq('evidence_region','UK')
      .eq('price_currency','GBP')
      .in('price_type',['new','new_sale'])
      .not('sell_price','is',null)
      .order('checked_at',{ascending:false});
    if(error)throw error;
    (data||[]).forEach(row=>{
      if(!comparisons.has(row.catalog_product_id))comparisons.set(row.catalog_product_id,Number(row.sell_price));
    });
  }
  return comparisons;
}

function calculate(comparison){
  const sealed=comparison*num('sealed-percent')/100;
  const discount=id=>sealed*(1-num(id)/100);
  return {
    sealed,
    opened:discount('opened-discount'),
    excellent:discount('excellent-discount'),
    good:discount('good-discount'),
    fair:discount('fair-discount')
  };
}

async function preview(){
  try{
    if(!val('rule-manufacturer'))throw new Error('Select a manufacturer first.');
    const selected=scopeProducts();
    if(!selected.length)throw new Error('No products match the selected scope.');

    const comparisons=await getComparisons(selected.map(p=>p.id));
    previewRows=selected
      .filter(p=>comparisons.has(p.id))
      .map(p=>({product:p,comparison:comparisons.get(p.id),...calculate(comparisons.get(p.id))}));

    renderPreview();
    $('apply-rule').disabled=!(savedRuleId&&previewRows.length);
    msg(previewRows.length+' products have qualifying UK New online comparison prices and can be priced.');
  }catch(error){
    msg(error.message||String(error),true);
  }
}

function renderPreview(){
  const body=$('preview-body');
  body.innerHTML=previewRows.length
    ?previewRows.map(row=>'<tr><td><strong>'+esc(row.product.manufacturer)+' '+esc(row.product.model)+'</strong><br><small>'+esc(row.product.package_name||'')+'</small></td><td>'+money(row.comparison)+'</td><td>'+money(row.sealed)+'</td><td>'+money(row.opened)+'</td><td>'+money(row.excellent)+'</td><td>'+money(row.good)+'</td><td>'+money(row.fair)+'</td></tr>').join('')
    :'<tr><td colspan="7">No qualifying UK New online comparison prices found for this selection.</td></tr>';

  const inScope=scopeProducts().length;
  $('preview-text').textContent=previewRows.length
    ?previewRows.length+' products will be affected if the rule is applied.'
    :'No qualifying products found.';

  $('pricing-summary').innerHTML=[
    ['Products in scope',inScope],
    ['With UK New comparison',previewRows.length],
    ['Excluded — no comparison',inScope-previewRows.length],
    ['Manufacturer',val('rule-manufacturer')||'—']
  ].map(([label,value])=>'<div class="pricing-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join('');
}

async function saveRule(){
  try{
    if(!val('rule-manufacturer'))throw new Error('Select a manufacturer first.');
    if(!previewRows.length)await preview();
    if(!previewRows.length)throw new Error('There are no qualifying products to save for this rule.');

    const row={
      manufacturer:val('rule-manufacturer'),
      main_category:nullable('rule-main-category'),
      product_type:nullable('rule-product-type'),
      category:nullable('rule-category'),
      sealed_percent:num('sealed-percent'),
      opened_unused_discount_percent:num('opened-discount'),
      excellent_discount_percent:num('excellent-discount'),
      good_discount_percent:num('good-discount'),
      fair_discount_percent:num('fair-discount'),
      active:true,
      updated_at:new Date().toISOString()
    };

    let result;
    if(savedRuleId){
      result=await sb().from('quote_catalog_pricing_rules').update(row).eq('id',savedRuleId).select('id').single();
    }else{
      result=await sb().from('quote_catalog_pricing_rules').insert(row).select('id').single();
    }
    if(result.error)throw result.error;

    savedRuleId=result.data.id;
    await loadRules();
    $('saved-rule').value=savedRuleId;
    updateSavedRuleControls();
    $('apply-rule').disabled=!previewRows.length;
    msg('Pricing block saved. Review the preview, then apply it when ready.');
  }catch(error){
    msg(error.message||String(error),true);
  }
}

async function applyRule(){
  try{
    if(!savedRuleId)throw new Error('Save the pricing block first.');
    if(!previewRows.length)throw new Error('Preview the products first.');
    if(!confirm('Apply this pricing block to '+previewRows.length+' products? This updates only the automatic pricing fields and does not modify evidence.'))return;

    $('apply-rule').disabled=true;
    const {data,error}=await sb().rpc('apply_quote_catalog_pricing_rule',{p_rule_id:savedRuleId});
    if(error)throw error;

    const count=Array.isArray(data)?data[0]?.updated_products:data;
    msg('Automatic pricing applied to '+(count??previewRows.length)+' products.');

    await loadProducts();
    await loadRules();
  }catch(error){
    msg('Pricing update failed: '+(error.message||String(error)),true);
    $('apply-rule').disabled=false;
  }
}

/* Quick access: products already priced by an Automatic Pricing Rule. */
function automaticProducts(){
  return products.filter(p=>String(p.pricing_source||'').toLowerCase()==='automatic'||!!p.automatic_pricing_rule_id);
}

function refreshAutomaticManufacturerFilter(){
  const automatic=automaticProducts();
  fill('automatic-product-manufacturer',automatic.map(p=>p.manufacturer),'All manufacturers');
}

function refreshAutomaticRuleFilter(){
  const automatic=automaticProducts();
  const usedRuleIds=[...new Set(automatic.map(p=>p.automatic_pricing_rule_id).filter(Boolean))];
  const el=$('automatic-product-rule');
  if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">All pricing blocks</option>'+usedRuleIds.map(id=>{
    const rule=savedRules.find(r=>r.id===id);
    return '<option value="'+esc(id)+'">'+esc(rule?ruleLabel(rule):'Automatic rule '+id)+'</option>';
  }).join('');
  if(usedRuleIds.includes(current))el.value=current;
}

function filteredAutomaticProducts(){
  const query=val('automatic-product-search').toLowerCase();
  const manufacturer=val('automatic-product-manufacturer');
  const ruleId=val('automatic-product-rule');

  return automaticProducts().filter(p=>{
    const text=[p.manufacturer,p.model,p.package_name,p.main_category,p.product_type,p.category].join(' ').toLowerCase();
    return (!query||text.includes(query))&&
      (!manufacturer||p.manufacturer===manufacturer)&&
      (!ruleId||p.automatic_pricing_rule_id===ruleId);
  });
}

function renderAutomaticProducts(){
  refreshAutomaticManufacturerFilter();
  refreshAutomaticRuleFilter();

  const all=automaticProducts();
  const rows=filteredAutomaticProducts();
  const list=$('automatic-products-list');
  const ruleCount=new Set(all.map(p=>p.automatic_pricing_rule_id).filter(Boolean)).size;
  const manufacturerCount=new Set(all.map(p=>p.manufacturer).filter(Boolean)).size;

  $('automatic-products-summary').innerHTML=[
    ['Automatically priced',all.length],
    ['Showing',rows.length],
    ['Manufacturers',manufacturerCount],
    ['Pricing blocks',ruleCount]
  ].map(([label,value])=>'<div class="pricing-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join('');

  if(!rows.length){
    list.innerHTML='<div class="empty-account"><h3>No automatically priced products found</h3><p>Products appear here after automatic pricing has been applied.</p></div>';
    return;
  }

  list.innerHTML=rows.map(p=>{
    const rule=savedRules.find(r=>r.id===p.automatic_pricing_rule_id);
    const prices=[
      'Sealed '+money(p.factory_sealed_price),
      'Unused '+money(p.opened_unused_price),
      'Excellent '+money(p.excellent_price),
      'Good '+money(p.good_price),
      'Fair '+money(p.fair_price)
    ].join(' · ');

    return '<article class="automatic-product-card">'+
      '<div class="section-kicker">'+esc(p.manufacturer||'')+' · AUTOMATIC</div>'+
      '<h3>'+esc(p.manufacturer||'')+' '+esc(p.model||'')+'</h3>'+
      '<p>'+esc(p.package_name||'')+'</p>'+
      '<p class="automatic-product-prices">'+esc(prices)+'</p>'+
      '<div class="automatic-list-actions"><small>'+esc(rule?ruleLabel(rule):'Automatic Pricing Rule')+'</small>'+
      '<a class="btn btn-secondary" href="admin-catalog.html?product='+encodeURIComponent(p.id)+'">EDIT PRODUCT</a></div>'+
    '</article>';
  }).join('');
}

document.addEventListener('DOMContentLoaded',async()=>{
  try{
    if(!await requireStaff())return;

    await Promise.all([loadProducts(),loadRules()]);

    ['rule-manufacturer','rule-main-category','rule-product-type'].forEach(id=>{
      $(id).addEventListener('change',()=>{
        refreshScopeFilters();
        if(savedRuleId){savedRuleId=null;$('saved-rule').value='';updateSavedRuleControls();}
        $('apply-rule').disabled=true;
      });
    });

    $('rule-category').addEventListener('change',()=>{
      if(savedRuleId){savedRuleId=null;$('saved-rule').value='';updateSavedRuleControls();}
      $('apply-rule').disabled=true;
    });

    $('saved-rule').addEventListener('change',updateSavedRuleControls);
    $('load-rule').addEventListener('click',loadSelectedRule);
    $('new-rule').addEventListener('click',newRule);
    $('delete-rule').addEventListener('click',async()=>{try{await deleteSelectedRule();}catch(error){msg(error.message||String(error),true);}});
    $('preview-rule').addEventListener('click',preview);
    $('save-rule').addEventListener('click',saveRule);
    $('apply-rule').addEventListener('click',applyRule);

    $('automatic-product-search').addEventListener('input',renderAutomaticProducts);
    $('automatic-product-manufacturer').addEventListener('change',renderAutomaticProducts);
    $('automatic-product-rule').addEventListener('change',renderAutomaticProducts);
  }catch(error){
    console.error(error);
    msg(error.message||String(error),true);
  }
});
})();