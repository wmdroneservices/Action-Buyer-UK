/* GearCashOut catalogue-centred pending AI evidence review.
   Pending AI candidates stay OUT of quote_catalog_retailer_prices until explicitly accepted.
   This file adds a review surface to the main catalogue without replacing the existing live evidence editor. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(v,c='GBP')=>v==null||v===''?'—':(String(c||'GBP').toUpperCase()==='GBP'?'£':String(c||'').toUpperCase()+' ')+Number(v).toFixed(2);
const clean=v=>String(v??'').trim();
const effective=(c,a,b)=>c[a]??c[b]??'';
let pending=[];
let pendingByProduct=new Map();
let productById=new Map();
let refreshTimer=null;

function sb(){return window.actionBuyerAuth?.supabase;}
function currentProductId(){return clean(document.getElementById('product-id')?.value);}
function categoryOf(c){return clean(effective(c,'edited_evidence_category','evidence_category')||c.price_type||'market').toLowerCase();}
function categoryLabel(c){const x=categoryOf(c);return x==='new_uk'?'UK — NEW':x==='used_uk'?'UK — USED / OTHER':x==='overseas'?'OVERSEAS':x.replaceAll('_',' ').toUpperCase();}
function sourceHost(c){const raw=effective(c,'edited_source_url','source_url');try{return new URL(raw).hostname.replace(/^www\./,'');}catch{return raw||effective(c,'edited_source_kind','source_kind')||'—';}}

async function loadPending(){
 const client=sb(); if(!client)return;
 const {data,error}=await client.from('quote_catalog_ai_candidates').select('*').eq('decision','pending').is('applied_at',null).order('created_at',{ascending:false}).limit(5000);
 if(error){console.error('Pending AI evidence load failed',error);return;}
 pending=data||[];
 productById=new Map();
 const ids=[...new Set(pending.map(c=>c.catalog_product_id).filter(Boolean))];
 if(ids.length){
   const {data:products,error:productError}=await client.from('quote_catalog_products').select('id,manufacturer,model,package_name,package_key,category').in('id',ids);
   if(productError)console.error('Pending product lookup failed',productError);
   (products||[]).forEach(p=>productById.set(String(p.id),p));
 }
 pendingByProduct=new Map();
 for(const c of pending){
   if(!c.catalog_product_id)continue;
   const key=String(c.catalog_product_id);
   if(!pendingByProduct.has(key))pendingByProduct.set(key,[]);
   pendingByProduct.get(key).push(c);
 }
 renderWarning();
 annotateCatalogue();
 renderCurrentProductPending();
}

function ensureWarning(){
 let el=document.getElementById('catalog-pending-ai-warning');
 if(el)return el;
 el=document.createElement('section');
 el.id='catalog-pending-ai-warning';
 el.className='catalog-pending-ai-warning';
 const anchor=document.getElementById('product-editor')||document.querySelector('.account-panel');
 anchor?.parentNode?.insertBefore(el,anchor);
 return el;
}

function renderWarning(){
 const el=ensureWarning();if(!el)return;
 if(!pending.length){el.innerHTML='<div class="catalog-pending-ai-ok"><strong>CATALOGUE REVIEW QUEUE CLEAR</strong><span>No AI evidence is currently waiting for verification.</span></div>';return;}
 const productCount=pendingByProduct.size;
 const manufacturers=new Map();
 for(const [pid,items] of pendingByProduct){
   const p=productById.get(String(pid));
   const name=clean(p?.manufacturer)||'Other / unavailable';
   if(!manufacturers.has(name))manufacturers.set(name,[]);
   manufacturers.get(name).push({pid,items,p});
 }
 const groups=[...manufacturers.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 el.innerHTML='<div class="catalog-pending-ai-head"><div><span class="catalog-pending-ai-icon">P</span><div><strong>PENDING AI EVIDENCE REQUIRES REVIEW</strong><small>'+pending.length+' evidence item'+(pending.length===1?'':'s')+' across '+productCount+' product'+(productCount===1?'':'s')+'. Pending evidence does not affect live pricing until approved.</small></div></div><button type="button" class="btn btn-secondary" data-pending-open-all>OPEN PENDING CHECKLIST</button></div>'
 +'<details class="catalog-pending-ai-dropdown"><summary>VIEW PRODUCTS NEEDING REVIEW</summary><div class="catalog-pending-ai-groups">'
 +groups.map(([manufacturer,rows])=>'<section class="catalog-pending-ai-manufacturer"><h3>'+esc(manufacturer)+' <span>'+rows.reduce((n,r)=>n+r.items.length,0)+' pending</span></h3>'
 +'<div>'+rows.sort((a,b)=>String(a.p?.model||'').localeCompare(String(b.p?.model||''))).map(r=>'<button type="button" class="catalog-pending-ai-product" data-pending-product="'+esc(r.pid)+'"><strong>'+esc([r.p?.manufacturer,r.p?.model,r.p?.package_name||r.p?.package_key].filter(Boolean).join(' · ')||'Open catalogue product')+'</strong><span><b>P</b> '+r.items.length+' pending</span></button>').join('')+'</div></section>').join('')
 +'</div></details>';
}

function annotateCatalogue(){
 const list=document.getElementById('catalog-list');if(!list)return;
 list.querySelectorAll('.edit-product[data-id]').forEach(btn=>{
   const card=btn.closest('.valuation-card');if(!card)return;
   card.querySelector('.catalog-pending-card-badge')?.remove();
   const items=pendingByProduct.get(String(btn.dataset.id));
   if(!items?.length)return;
   const badge=document.createElement('span');
   badge.className='catalog-pending-card-badge';
   badge.innerHTML='<b>P</b> '+items.length+' PENDING';
   btn.parentNode?.insertBefore(badge,btn);
 });
}

function candidateMarkup(c,index){
 const id=esc(c.id),title=effective(c,'edited_title','discovered_title'),price=effective(c,'edited_price','price'),condition=effective(c,'edited_condition','condition'),url=effective(c,'edited_source_url','source_url');
 const refMin=effective(c,'edited_reference_price_min','reference_price_min')||price;
 const refMax=effective(c,'edited_reference_price_max','reference_price_max');
 const observedConditions=effective(c,'edited_observed_conditions','observed_conditions')||condition;
 const rangeText=refMax!==''&&refMax!=null&&Number(refMax)!==Number(refMin)?money(refMin,c.edited_currency??c.currency)+' → '+money(refMax,c.edited_currency??c.currency):money(refMin,c.edited_currency??c.currency);
 const selected=(field,value)=>String(effective(c,'edited_'+field,field))===value?' selected':'';
 const outcome='<option value="">NOT CHECKED</option><option value="correct">AI WAS RIGHT</option><option value="wrong">AI WAS WRONG</option><option value="adjusted">ADJUSTED</option>';
 return '<article class="catalog-pending-evidence-card" data-pending-candidate="'+id+'">'
 +'<div class="catalog-pending-evidence-head"><span class="catalog-pending-ai-icon">P</span><div><p>PENDING EVIDENCE '+(index+1)+' · '+esc(categoryLabel(c))+(c.reference_only?' · REFERENCE ONLY':'')+'</p><h4>'+esc(title||'Unnamed evidence')+'</h4><div class="catalog-pending-evidence-meta"><span><strong>FROM → TO:</strong> '+esc(rangeText)+'</span><span>'+esc(observedConditions||'Unknown conditions')+'</span><span>'+esc(sourceHost(c))+'</span>'+(c.observed_units_count?'<span>'+esc(c.observed_units_count)+' units observed</span>':'')+(c.reference_only?'<span><strong>REFERENCE ONLY</strong></span>':'')+'</div></div></div>'
 +'<div class="catalog-pending-editor-grid">'
 +'<label>Exact product title<input data-field="edited_title" value="'+esc(title)+'"></label>'
 +'<label>From price<input data-field="edited_reference_price_min" type="number" min="0" step="0.01" value="'+esc(refMin)+'"></label>'
 +'<label>To price<input data-field="edited_reference_price_max" type="number" min="0" step="0.01" value="'+esc(refMax)+'"></label>'
 +'<label>Conditions observed<input data-field="edited_observed_conditions" value="'+esc(observedConditions)+'"></label>'
 +'<label>Condition label<input data-field="edited_condition" value="'+esc(condition)+'"></label>'
 +'<label>Evidence category<select data-field="edited_evidence_category"><option value="new_uk"'+(categoryOf(c)==='new_uk'?' selected':'')+'>UK — NEW</option><option value="used_uk"'+(categoryOf(c)==='used_uk'?' selected':'')+'>UK — USED / OTHER</option><option value="overseas"'+(categoryOf(c)==='overseas'?' selected':'')+'>OVERSEAS</option></select></label>'
 +'<label>Availability<select data-field="edited_availability_status"><option value="in_stock"'+selected('availability_status','in_stock')+'>In stock</option><option value="out_of_stock"'+selected('availability_status','out_of_stock')+'>Out of stock</option><option value="unknown"'+selected('availability_status','unknown')+'>Unknown</option></select></label>'
 +'<label>Package match<select data-field="edited_package_match"><option value="exact"'+selected('package_match','exact')+'>Exact</option><option value="compatible"'+selected('package_match','compatible')+'>Compatible</option><option value="uncertain"'+selected('package_match','uncertain')+'>Uncertain</option><option value="mismatch"'+selected('package_match','mismatch')+'>Mismatch</option></select></label>'
 +'<label>Variant match<select data-field="edited_variant_match"><option value="exact"'+selected('variant_match','exact')+'>Exact</option><option value="compatible"'+selected('variant_match','compatible')+'>Compatible</option><option value="uncertain"'+selected('variant_match','uncertain')+'>Uncertain</option><option value="mismatch"'+selected('variant_match','mismatch')+'>Mismatch</option></select></label>'
 +'<label class="catalog-pending-wide">Exact source URL<input data-field="edited_source_url" type="url" value="'+esc(url)+'"></label>'
 +'<label class="catalog-pending-wide">Evidence notes<textarea data-field="edited_evidence_notes" rows="2">'+esc(effective(c,'edited_evidence_notes','evidence_notes'))+'</textarea></label>'
 +'</div>'
 +'<div class="catalog-pending-checks"><strong>VERIFY EACH FIELD</strong>'
 +[['price','FROM / TO PRICE RANGE'],['product_match','PRODUCT / MODEL / PACKAGE'],['url','EXACT PRODUCT PAGE URL'],['condition','CONDITIONS REPRESENTED'],['availability','AVAILABILITY'],['source','SOURCE / RETAILER'],['evidence_bucket','EVIDENCE CATEGORY']].map(([k,label])=>'<label>'+label+'<select data-review-outcome="'+k+'">'+outcome+'</select></label>').join('')
 +'</div>'
 +'<label class="catalog-pending-wide">Review reason / correction reason<textarea data-review-reason rows="3" placeholder="Required when denying. Also explain any corrections so Gemma can learn."></textarea></label>'
 +'<div class="catalog-pending-actions">'+(url?'<a class="btn btn-secondary" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">VERIFY LATEST MPB PRICES</a>':'')
 +'<button type="button" class="btn btn-primary" data-pending-accept="'+id+'">ACCEPT & ADD TO CATALOGUE</button>'
 +'<button type="button" class="btn btn-secondary catalog-pending-deny" data-pending-deny="'+id+'">DENY — KEEP CATALOGUE AS IS</button>'
 +'<span class="catalog-pending-status" aria-live="polite"></span></div>'
 +'</article>';
}
function renderCurrentProductPending(){
 const id=currentProductId();
 let section=document.getElementById('catalog-pending-evidence-section');
 if(!id){section?.remove();return;}
 const items=pendingByProduct.get(id)||[];
 const table=document.querySelector('.retailer-table')?.parentElement;
 if(!table)return;
 if(!section){section=document.createElement('section');section.id='catalog-pending-evidence-section';table.parentNode?.insertBefore(section,table.nextSibling);}
 if(!items.length){section.remove();return;}
 const buckets={new_uk:[],used_uk:[],overseas:[]};
 items.forEach(c=>(buckets[categoryOf(c)]||buckets.used_uk).push(c));
 section.innerHTML='<div class="catalog-pending-section-title"><div><span class="catalog-pending-ai-icon">P</span><div><p class="section-kicker">AI REVIEW</p><h3>PENDING EVIDENCE — NOT LIVE</h3><p>These findings are displayed beside the relevant catalogue evidence but cannot affect live comparison or automatic pricing until you verify and accept them.</p></div></div></div>'
 +[['new_uk','UK — NEW PENDING EVIDENCE'],['used_uk','UK — USED / OTHER PENDING EVIDENCE'],['overseas','OVERSEAS PENDING EVIDENCE']].map(([key,label])=>buckets[key].length?'<section class="catalog-pending-bucket"><h4>'+label+' <span>'+buckets[key].length+'</span></h4>'+buckets[key].map(candidateMarkup).join('')+'</section>':'').join('');
}

async function saveEdits(card,c){
 const client=sb();if(!client)throw Error('Supabase is unavailable.');
 const get=name=>clean(card.querySelector('[data-field="'+name+'"]')?.value);
 const number=name=>{const raw=get(name);if(raw==='')return null;const n=Number(raw);if(!Number.isFinite(n)||n<0)throw Error('Price must be a valid non-negative number.');return n;};
 const url=get('edited_source_url');if(url){try{new URL(url);}catch{throw Error('Please enter a valid exact source URL.');}}
 const payload={
   edited_title:get('edited_title')||null,
   edited_price:number('edited_reference_price_min'),
   edited_reference_price_min:number('edited_reference_price_min'),
   edited_reference_price_max:number('edited_reference_price_max'),
   edited_observed_conditions:get('edited_observed_conditions')||null,
   edited_condition:get('edited_condition')||null,
   edited_source_url:url||null,
   edited_evidence_category:get('edited_evidence_category')||null,
   edited_availability_status:get('edited_availability_status')||null,
   edited_package_match:get('edited_package_match')||null,
   edited_variant_match:get('edited_variant_match')||null,
   edited_evidence_notes:get('edited_evidence_notes')||null,
   reviewed_at:new Date().toISOString()
 };
 if(payload.edited_reference_price_min!=null&&payload.edited_reference_price_max!=null&&payload.edited_reference_price_max<payload.edited_reference_price_min)throw Error('To price cannot be lower than From price.');
 const {error}=await client.from('quote_catalog_ai_candidates').update(payload).eq('id',c.id);
 if(error)throw error;
 return {...c,...payload};
}

async function reviewCandidate(id,decision,button){
 const card=button.closest('[data-pending-candidate]');const original=pending.find(x=>String(x.id)===String(id));if(!card||!original)return;
 const status=card.querySelector('.catalog-pending-status');
 const say=(t,err=false)=>{if(status){status.textContent=t;status.className='catalog-pending-status '+(err?'error':'success');}};
 const reason=clean(card.querySelector('[data-review-reason]')?.value);
 if(decision==='rejected'&&!reason){say('Please explain why you are denying this evidence.',true);return;}
 const outcomes={};card.querySelectorAll('[data-review-outcome]').forEach(x=>{const v=clean(x.value);if(v)outcomes[x.dataset.reviewOutcome]=v;});
 const originalText=button.textContent;button.disabled=true;
 try{
   say('Saving your review…');
   const c=await saveEdits(card,original);
   if(decision==='accepted'&&Object.values(outcomes).includes('adjusted')&&!reason)throw Error('Please explain the correction so Gemma can learn from the adjustment.');
   const client=sb();
   const {error}=await client.rpc('record_ai_candidate_manual_review',{p_candidate_id:id,p_decision:decision,p_reason:reason||null,p_reviewed_fields:outcomes});
   if(error)throw error;
   if(decision==='accepted'){
     say('Adding approved evidence to the live catalogue…');
     const {error:applyError}=await client.rpc('apply_accepted_ai_candidate',{p_candidate_id:id});
     if(applyError)throw applyError;
     window.dispatchEvent(new CustomEvent('gco:evidence-saved',{detail:{productId:c.catalog_product_id}}));
   }
   await loadPending();
   if(decision==='accepted')say('Approved and added to live catalogue evidence.');
   else say('Denied. The live catalogue remains unchanged.');
 }catch(e){console.error(e);say(e.message||String(e),true);}
 finally{if(document.contains(button)){button.disabled=false;button.textContent=originalText;}}
}

function openProduct(id){
 const url=new URL(location.href);url.searchParams.set('product',id);location.href=url.pathname+url.search+url.hash;
}

document.addEventListener('click',e=>{
 const catalogueEdit=e.target.closest('.edit-product');if(catalogueEdit){setTimeout(renderCurrentProductPending,80);}
 const product=e.target.closest('[data-pending-product]');if(product){openProduct(product.dataset.pendingProduct);return;}
 if(e.target.closest('[data-pending-open-all]')){document.querySelector('.catalog-pending-ai-dropdown')?.setAttribute('open','');document.getElementById('catalog-pending-ai-warning')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 const accept=e.target.closest('[data-pending-accept]');if(accept){reviewCandidate(accept.dataset.pendingAccept,'accepted',accept);return;}
 const deny=e.target.closest('[data-pending-deny]');if(deny){reviewCandidate(deny.dataset.pendingDeny,'rejected',deny);return;}
});

function installObservers(){
 const list=document.getElementById('catalog-list');
 if(list)new MutationObserver(()=>{if(refreshTimer)clearTimeout(refreshTimer);refreshTimer=setTimeout(annotateCatalogue,30);}).observe(list,{childList:true,subtree:true});
 const editor=document.getElementById('product-editor');
 if(editor)editor.addEventListener('toggle',()=>{if(editor.open)renderCurrentProductPending();});
 const productId=document.getElementById('product-id');
 if(productId)new MutationObserver(()=>setTimeout(renderCurrentProductPending,0)).observe(productId,{attributes:true,attributeFilter:['value']});
 document.addEventListener('gco:evidence-saved',()=>setTimeout(loadPending,150));
}

async function boot(){
 installObservers();
 // admin-catalog.js may still be loading products; retry the first render briefly.
 await loadPending();
 let attempts=0;const tick=()=>{renderWarning();annotateCatalogue();renderCurrentProductPending();if(++attempts<8)setTimeout(tick,400);};tick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100),{once:true});else setTimeout(boot,100);
})();