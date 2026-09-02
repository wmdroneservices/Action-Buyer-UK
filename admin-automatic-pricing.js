/* GearCashOut automatic catalogue block pricing. */
(function(){
'use strict';
const A=()=>window.actionBuyerAuth,S=()=>A()?.supabase,$=id=>document.getElementById(id);
let products=[],previewRows=[],savedRuleId=null,savedRules=[];
const money=v=>v==null?'—':Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(t,bad=false){const e=$('pricing-message');e.textContent=t;e.className='pricing-message show '+(bad?'error':'success');}
function val(id){return $(id).value.trim();}
function num(id){const n=Number($(id).value);return Number.isFinite(n)?n:0;}
async function staff(){const s=await A().getSession();if(!s){location.href='login.html?return=admin-automatic-pricing.html';return false;}const r=await S().from('staff_users').select('user_id').eq('user_id',s.user.id).maybeSingle();if(r.error)throw r.error;if(!r.data){document.body.innerHTML='<main class="account-page"><div class="container"><section class="account-panel"><h1>Staff access required</h1></section></div></main>';return false;}return true;}
function scope(){return products.filter(p=>(!val('rule-manufacturer')||p.manufacturer===val('rule-manufacturer'))&&(!val('rule-main-category')||p.main_category===val('rule-main-category'))&&(!val('rule-product-type')||p.product_type===val('rule-product-type'))&&(!val('rule-category')||p.category===val('rule-category')));}
function fill(id,values,placeholder){const current=val(id),e=$(id);e.innerHTML='<option value="">'+placeholder+'</option>'+[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if([...e.options].some(o=>o.value===current))e.value=current;}
function refreshFilters(){const base=val('rule-manufacturer')?products.filter(p=>p.manufacturer===val('rule-manufacturer')):products;fill('rule-main-category',base.map(p=>p.main_category),'All main categories');const b1=base.filter(p=>!val('rule-main-category')||p.main_category===val('rule-main-category'));fill('rule-product-type',b1.map(p=>p.product_type),'All product types');const b2=b1.filter(p=>!val('rule-product-type')||p.product_type===val('rule-product-type'));fill('rule-category',b2.map(p=>p.category),'All branches');}
function ruleLabel(r){const scope=[r.main_category,r.product_type,r.category].filter(Boolean).join(' › ')||'All products';return r.manufacturer+' — '+scope+' ('+Number(r.sealed_percent)+'% sealed)';}
async function loadRules(){const r=await S().from('quote_catalog_pricing_rules').select('id,manufacturer,main_category,product_type,category,sealed_percent,opened_unused_discount_percent,excellent_discount_percent,good_discount_percent,fair_discount_percent,active,created_at,updated_at').order('updated_at',{ascending:false});if(r.error)throw r.error;savedRules=r.data||[];const e=$('saved-rule');e.innerHTML='<option value="">Select a saved block</option>'+savedRules.map(x=>'<option value="'+x.id+'">'+esc(ruleLabel(x))+'</option>').join('');}
function resetBlock(){savedRuleId=null;previewRows=[];$('saved-rule').value='';$('rule-manufacturer').value='';refreshFilters();$('rule-main-category').value='';$('rule-product-type').value='';$('rule-category').value='';$('sealed-percent').value='80';$('opened-discount').value='5';$('excellent-discount').value='15';$('good-discount').value='25';$('fair-discount').value='40';$('apply-rule').disabled=true;renderPreview();$('preview-text').textContent='Create a new block, select its scope, then preview the products.';msg('New pricing block ready.');}
function loadSelectedRule(){const id=$('saved-rule').value;const r=savedRules.find(x=>x.id===id);if(!r){msg('Select a saved pricing block first.',true);return;}savedRuleId=r.id;$('rule-manufacturer').value=r.manufacturer||'';refreshFilters();$('rule-main-category').value=r.main_category||'';refreshFilters();$('rule-product-type').value=r.product_type||'';refreshFilters();$('rule-category').value=r.category||'';$('sealed-percent').value=r.sealed_percent??'';$('opened-discount').value=r.opened_unused_discount_percent??'';$('excellent-discount').value=r.excellent_discount_percent??'';$('good-discount').value=r.good_discount_percent??'';$('fair-discount').value=r.fair_discount_percent??'';previewRows=[];$('apply-rule').disabled=true;renderPreview();$('preview-text').textContent='Block loaded. Preview the current scope, edit if required, then save your changes.';msg('Saved pricing block loaded for editing.');}
function calculate(price){const sealed=price*num('sealed-percent')/100;const off=x=>sealed*(1-num(x)/100);return {sealed,opened:off('opened-discount'),excellent:off('excellent-discount'),good:off('good-discount'),fair:off('fair-discount')};}
async function loadRules(){
  const r=await S().from('quote_catalog_pricing_rules').select('id,manufacturer,main_category,product_type,category,sealed_percent,opened_unused_discount_percent,excellent_discount_percent,good_discount_percent,fair_discount_percent,active,created_at,updated_at').order('updated_at',{ascending:false}).order('created_at',{ascending:false});
  if(r.error)throw r.error;
  savedRules=r.data||[];
  renderSavedRules();
}
function ruleLabel(r){
  return [r.manufacturer,r.main_category,r.product_type,r.category].filter(Boolean).join(' · ')||'Unnamed block';
}
function renderSavedRules(){
  const e=$('saved-rule');
  const current=savedRuleId||e.value;
  e.innerHTML='<option value="">Select a saved pricing block</option>'+savedRules.map(r=>'<option value="'+esc(r.id)+'">'+esc(ruleLabel(r))+'</option>').join('');
  if(current&&savedRules.some(r=>r.id===current))e.value=current;
  $('load-rule').disabled=!e.value;
  $('delete-rule').disabled=!e.value;
  updateSavedRuleDetails();
}
function updateSavedRuleDetails(){
  const r=savedRules.find(x=>x.id===$('saved-rule').value);
  $('saved-rule-details').textContent=r?'Sealed '+r.sealed_percent+'% · Opened/unused '+r.opened_unused_discount_percent+'% off · Excellent '+r.excellent_discount_percent+'% off · Good '+r.good_discount_percent+'% off · Fair '+r.fair_discount_percent+'% off':'No saved block selected.';
}
function loadSelectedRule(){
  const r=savedRules.find(x=>x.id===$('saved-rule').value);
  if(!r){msg('Select a saved pricing block first.',true);return;}
  savedRuleId=r.id;
  $('rule-manufacturer').value=r.manufacturer||'';
  refreshFilters();
  $('rule-main-category').value=r.main_category||'';
  refreshFilters();
  $('rule-product-type').value=r.product_type||'';
  refreshFilters();
  $('rule-category').value=r.category||'';
  $('sealed-percent').value=r.sealed_percent??80;
  $('opened-discount').value=r.opened_unused_discount_percent??5;
  $('excellent-discount').value=r.excellent_discount_percent??15;
  $('good-discount').value=r.good_discount_percent??25;
  $('fair-discount').value=r.fair_discount_percent??40;
  previewRows=[];$('apply-rule').disabled=true;
  $('preview-text').textContent='Block loaded. Preview products to review the current scope before applying changes.';
  $('preview-body').innerHTML='<tr><td colspan="7">Block loaded. Click Preview Products to recalculate the affected products.</td></tr>';
  msg('Saved pricing block loaded. You can now edit it and Save / Update Rule.');
}
function newRule(){
  savedRuleId=null;
  $('saved-rule').value='';
  $('rule-manufacturer').value='';refreshFilters();
  $('sealed-percent').value=80;$('opened-discount').value=5;$('excellent-discount').value=15;$('good-discount').value=25;$('fair-discount').value=40;
  previewRows=[];$('apply-rule').disabled=true;
  $('preview-text').textContent='Create a new manufacturer and branch pricing block.';
  $('preview-body').innerHTML='<tr><td colspan="7">No preview loaded.</td></tr>';
  updateSavedRuleDetails();msg('New pricing block ready.');
}
async function deleteSelectedRule(){
  const id=$('saved-rule').value;
  if(!id)throw new Error('Select a saved rule first.');
  if(!confirm('Delete this saved pricing rule? Existing product prices will not be changed.'))return;
  const r=await S().from('quote_catalog_pricing_rules').delete().eq('id',id);
  if(r.error)throw r.error;
  if(savedRuleId===id)savedRuleId=null;
  await loadRules();msg('Saved pricing rule deleted. Existing product prices were not changed.');
}
async function loadProducts(){let all=[],from=0;while(true){const r=await S().from('quote_catalog_products').select('id,manufacturer,main_category,product_type,category,model,package_name').range(from,from+999).order('manufacturer').order('model');if(r.error)throw r.error;all.push(...(r.data||[]));if(!r.data||r.data.length<1000)break;from+=1000;}products=all;fill('rule-manufacturer',products.map(p=>p.manufacturer),'Select manufacturer');refreshFilters();}
async function getComparisons(ids){const out=new Map();for(let i=0;i<ids.length;i+=500){const r=await S().from('quote_catalog_retailer_prices').select('catalog_product_id,sell_price,checked_at').in('catalog_product_id',ids.slice(i,i+500)).eq('evidence_region','UK').eq('price_currency','GBP').in('price_type',['new','new_sale']).not('sell_price','is',null).order('checked_at',{ascending:false});if(r.error)throw r.error;(r.data||[]).forEach(x=>{if(!out.has(x.catalog_product_id))out.set(x.catalog_product_id,Number(x.sell_price));});}return out;}
async function preview(){try{const selected=scope();if(!val('rule-manufacturer'))throw new Error('Select a manufacturer first.');if(!selected.length)throw new Error('No products match the selected branch.');const comparisons=await getComparisons(selected.map(p=>p.id));previewRows=selected.filter(p=>comparisons.has(p.id)).map(p=>({product:p,comparison:comparisons.get(p.id),...calculate(comparisons.get(p.id))}));renderPreview();savedRuleId=null;$('apply-rule').disabled=true;msg(previewRows.length+' products have qualifying UK New online comparison prices and can be priced.');}catch(e){msg(e.message||String(e),true);}}
function renderPreview(){const body=$('preview-body');body.innerHTML=previewRows.length?previewRows.map(r=>'<tr><td><strong>'+esc(r.product.manufacturer)+' '+esc(r.product.model)+'</strong><br><small>'+esc(r.product.package_name||'')+'</small></td><td>'+money(r.comparison)+'</td><td>'+money(r.sealed)+'</td><td>'+money(r.opened)+'</td><td>'+money(r.excellent)+'</td><td>'+money(r.good)+'</td><td>'+money(r.fair)+'</td></tr>').join(''):'<tr><td colspan="7">No qualifying UK New online comparison prices found for this selection.</td></tr>';$('preview-text').textContent=previewRows.length?previewRows.length+' products will be affected if the rule is applied.':'No qualifying products found.';$('pricing-summary').innerHTML=[['Products in scope',scope().length],['With UK New comparison',previewRows.length],['Excluded — no comparison',scope().length-previewRows.length],['Manufacturer',val('rule-manufacturer')||'—']].map(x=>'<div class="pricing-stat"><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>').join('');}
function nullable(id){const x=val(id);return x||null;}
async function saveRule(){try{if(!val('rule-manufacturer'))throw new Error('Select a manufacturer first.');if(!previewRows.length)await preview();const row={manufacturer:val('rule-manufacturer'),main_category:nullable('rule-main-category'),product_type:nullable('rule-product-type'),category:nullable('rule-category'),sealed_percent:num('sealed-percent'),opened_unused_discount_percent:num('opened-discount'),excellent_discount_percent:num('excellent-discount'),good_discount_percent:num('good-discount'),fair_discount_percent:num('fair-discount'),active:true,updated_at:new Date().toISOString()};let r;
if(savedRuleId){
  r=await S().from('quote_catalog_pricing_rules').update(row).eq('id',savedRuleId).select('id').single();
}else{
  r=await S().from('quote_catalog_pricing_rules').insert(row).select('id').single();
}
if(r.error)throw r.error;
savedRuleId=r.data.id;
await loadRules();
$('saved-rule').value=savedRuleId;
renderSavedRules();
$('apply-rule').disabled=false;
msg('Pricing rule '+(savedRuleId?'saved':'saved')+'. Review the preview, then apply when ready.');}catch(e){msg(e.message||String(e),true);}}
async function apply(){try{if(!savedRuleId)throw new Error('Save the pricing rule first.');if(!confirm('Apply this pricing rule to '+previewRows.length+' products? This updates the automatic buying-price fields for the selected products.'))return;$('apply-rule').disabled=true;const r=await S().rpc('apply_quote_catalog_pricing_rule',{p_rule_id:savedRuleId});if(r.error)throw r.error;const count=Array.isArray(r.data)?r.data[0]?.updated_products:r.data;msg('Automatic pricing applied to '+(count??previewRows.length)+' products.');}catch(e){msg('Pricing update failed: '+(e.message||String(e)),true);$ ('apply-rule').disabled=false;}}
document.addEventListener('DOMContentLoaded',async()=>{try{if(!await staff())return;await Promise.all([loadProducts(),loadRules()]);['rule-manufacturer','rule-main-category','rule-product-type'].forEach(id=>$(id).addEventListener('change',()=>{refreshFilters();savedRuleId=null;$('apply-rule').disabled=true;}));$('rule-category').addEventListener('change',()=>{$('apply-rule').disabled=true;});
$('saved-rule').addEventListener('change',()=>{const has=!!$('saved-rule').value;$('load-rule').disabled=!has;$('delete-rule').disabled=!has;updateSavedRuleDetails();});
$('load-rule').addEventListener('click',loadSelectedRule);
$('new-rule').addEventListener('click',newRule);
$('delete-rule').addEventListener('click',async()=>{try{await deleteSelectedRule();}catch(e){msg(e.message||String(e),true);}});$('load-rule').addEventListener('click',loadSelectedRule);$('new-rule').addEventListener('click',resetBlock);$('preview-rule').addEventListener('click',preview);$('save-rule').addEventListener('click',saveRule);$('apply-rule').addEventListener('click',apply);}catch(e){console.error(e);msg(e.message||String(e),true);}});})();
