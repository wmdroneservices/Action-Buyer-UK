/* Valid evidence routing for package/model mismatches.
   Keeps the compact UI, but never relies only on transient DOM state to decide whether
   a route-to-alternative-product control should exist. */
(()=>{'use strict';
const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sb=()=>window.actionBuyerAuth?.supabase;
let activeProducts=null;
function domMismatch(card){
 const p=card.querySelector('[data-field="edited_package_match"]')?.value;
 const v=card.querySelector('[data-field="edited_variant_match"]')?.value;
 const review=card.querySelector('[data-review-outcome="product_match"]')?.value;
 return p==='mismatch'||v==='mismatch'||review==='wrong';
}
function style(){
 if(document.getElementById('ai-reassignment-style'))return;
 const s=document.createElement('style');s.id='ai-reassignment-style';
 s.textContent='.ai-route-panel{margin:8px 0;border:1px solid #c77a2b;background:#fff8ef}.ai-route-panel>summary{cursor:pointer;padding:10px 12px;color:#7a3d12;font-weight:700;list-style:none}.ai-route-panel>summary::-webkit-details-marker{display:none}.ai-route-panel>summary::after{content:"OPEN";float:right;font-size:11px;letter-spacing:.08em}.ai-route-panel[open]>summary::after{content:"CLOSE"}.ai-route-panel-body{padding:0 12px 12px}.ai-route-panel strong{display:block;color:#7a3d12;margin-bottom:5px}.ai-route-panel small{display:block;margin-bottom:9px}.ai-route-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ai-route-search{width:min(520px,100%);padding:8px;border:1px solid #b7b7b7}.ai-route-row select{min-width:360px;max-width:100%;padding:8px}.ai-route-status{display:block;margin-top:7px;font-weight:700}.ai-route-status.error{color:#9d3026}.ai-route-status.ok{color:#2f6d3a}@media(max-width:700px){.ai-route-row select{min-width:100%}}';
 document.head.appendChild(s);
}
function score(title,p){
 const t=norm(title),model=norm(p.model),pack=norm(p.package_name||p.package_key),maker=norm(p.manufacturer);let s=0;
 if(maker&&t.includes(maker))s+=20;if(model&&t.includes(model))s+=50;
 for(const w of pack.split(' ')){if(w.length>2&&t.includes(w))s+=5;}
 if(pack&&t.includes(pack))s+=40;return s;
}
async function getCandidateRouteState(id){
 const client=sb();if(!client)return null;
 const {data,error}=await client.from('quote_catalog_ai_candidates')
  .select('id,catalog_product_id,discovered_title,edited_title,package_match,variant_match,edited_package_match,edited_variant_match,decision,applied_at')
  .eq('id',id).maybeSingle();
 if(error||!data)return null;
 const mismatch=['package_match','variant_match','edited_package_match','edited_variant_match'].some(k=>data[k]==='mismatch');
 const pending=data.decision==='pending'&&!data.applied_at;
 return {...data,routeRequired:mismatch&&pending};
}
async function getProducts(client){
 if(activeProducts)return activeProducts;
 const {data,error}=await client.from('quote_catalog_products')
  .select('id,manufacturer,model,package_name,package_key,active').eq('active',true).limit(5000);
 if(error)throw error;activeProducts=data||[];return activeProducts;
}
async function addPanel(card){
 if(card.querySelector('.ai-route-panel'))return;
 const client=sb();if(!client)return;
 const id=card.dataset.pendingCandidate;if(!id)return;
 const c=await getCandidateRouteState(id);
 if(!c||!(c.routeRequired||domMismatch(card)))return;
 const title=c.edited_title||c.discovered_title||'';
 let products=[];try{products=await getProducts(client);}catch{return;}
 const choices=products.filter(p=>String(p.id)!==String(c.catalog_product_id)).map(p=>({p,s:score(title,p)}))
  .sort((a,b)=>b.s-a.s||String(a.p.model).localeCompare(String(b.p.model)));
 const panel=document.createElement('details');panel.className='ai-route-panel';
 panel.innerHTML='<summary>VALID EVIDENCE — ROUTE TO AN ALTERNATIVE PRODUCT</summary>'
 +'<div class="ai-route-panel-body"><strong>This evidence is valid, but the current catalogue target is wrong or too specific.</strong>'
 +'<small>Keep the source finding. Search the active catalogue and move it to the exact alternative product. This does not create duplicate live evidence.</small>'
 +'<div class="ai-route-row"><input class="ai-route-search" type="search" placeholder="Search catalogue by manufacturer, model, package or keyword…">'
 +'<select><option value="">Choose the alternative catalogue product…</option></select>'
 +'<button type="button" class="btn btn-secondary">MOVE EVIDENCE TO ALTERNATIVE PRODUCT</button></div>'
 +'<span class="ai-route-status" aria-live="polite"></span></div>';
 const search=panel.querySelector('.ai-route-search'),select=panel.querySelector('select'),button=panel.querySelector('button'),status=panel.querySelector('.ai-route-status');
 const renderChoices=term=>{
  const needle=norm(term);
  const filtered=choices.filter(({p})=>!needle||norm([p.manufacturer,p.model,p.package_name,p.package_key].filter(Boolean).join(' ')).includes(needle));
  const previous=select.value;
  select.innerHTML='<option value="">'+(filtered.length?'Choose the alternative catalogue product…':'No matching catalogue products found')+'</option>'
   +filtered.map(({p,s})=>'<option value="'+esc(p.id)+'"'+(s>0?' data-score="'+s+'"':'')+'>'+esc([p.manufacturer,p.model,p.package_name||p.package_key].filter(Boolean).join(' · '))+'</option>').join('');
  if(previous&&filtered.some(({p})=>String(p.id)===String(previous)))select.value=previous;
 };
 renderChoices('');
 search.addEventListener('input',()=>renderChoices(search.value));
 button.addEventListener('click',async()=>{
  const target=select.value;
  if(!target){status.textContent='Choose the alternative catalogue product first.';status.className='ai-route-status error';return;}
  button.disabled=true;status.textContent='Moving valid evidence to the selected catalogue product…';status.className='ai-route-status';
  try{
   const {error}=await client.rpc('reassign_ai_candidate',{p_candidate_id:id,p_target_catalog_product_id:target,p_reason:'Manual routing of valid evidence to an alternative exact catalogue product'});
   if(error)throw error;
   activeProducts=null;
   status.textContent='Moved. Reloading the pending review queue…';status.className='ai-route-status ok';
   setTimeout(()=>location.reload(),500);
  }catch(e){status.textContent=e.message||String(e);status.className='ai-route-status error';button.disabled=false;}
 });
 const checks=card.querySelector('.catalog-pending-checks');
 if(checks)checks.before(panel);else card.querySelector('.catalog-pending-editor-grid')?.after(panel);
}
function refreshCard(card){
 const panel=card.querySelector('.ai-route-panel');
 if(domMismatch(card)){if(!panel)addPanel(card);return;}
 // Server-backed mismatch remains authoritative if the editable DOM has not caught up yet.
 const id=card.dataset.pendingCandidate;
 if(id&&!panel)getCandidateRouteState(id).then(c=>{if(c?.routeRequired)addPanel(card);}).catch(()=>{});
 else if(panel)panel.remove();
}
function watch(card){
 if(card.dataset.aiRouteWatch)return;card.dataset.aiRouteWatch='1';
 card.addEventListener('change',e=>{
  if(e.target.matches('[data-field="edited_package_match"],[data-field="edited_variant_match"],[data-review-outcome="product_match"]'))refreshCard(card);
 });
}
function scan(){
 style();
 document.querySelectorAll('[data-pending-candidate]').forEach(card=>{watch(card);refreshCard(card);});
}
const mo=new MutationObserver(()=>scan());mo.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();setTimeout(scan,500);setTimeout(scan,1500);},{once:true});
else {scan();setTimeout(scan,500);setTimeout(scan,1500);}
})();