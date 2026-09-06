/* Valid evidence routing for package/model mismatches. */
(()=>{'use strict';
const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sb=()=>window.actionBuyerAuth?.supabase;
function mismatch(card){const p=card.querySelector('[data-field="edited_package_match"]')?.value;const v=card.querySelector('[data-field="edited_variant_match"]')?.value;const review=card.querySelector('[data-review-outcome="product_match"]')?.value;return p==='mismatch'||v==='mismatch'||review==='wrong';}
function style(){
 if(document.getElementById('ai-reassignment-style'))return;
 const s=document.createElement('style');s.id='ai-reassignment-style';
 s.textContent='.ai-route-panel{margin:12px 0;padding:12px;border:1px solid #c77a2b;background:#fff8ef}.ai-route-panel strong{display:block;color:#7a3d12;margin-bottom:5px}.ai-route-panel small{display:block;margin-bottom:9px}.ai-route-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ai-route-search{width:min(520px,100%);padding:8px;border:1px solid #b7b7b7}.ai-route-row select{min-width:360px;max-width:100%;padding:8px}.ai-route-status{display:block;margin-top:7px;font-weight:700}.ai-route-status.error{color:#9d3026}.ai-route-status.ok{color:#2f6d3a}@media(max-width:700px){.ai-route-row select{min-width:100%}}';
 document.head.appendChild(s);
}
function score(title,p){
 const t=norm(title), model=norm(p.model), pack=norm(p.package_name||p.package_key), maker=norm(p.manufacturer);
 let s=0;
 if(maker&&t.includes(maker))s+=20;
 if(model&&t.includes(model))s+=50;
 for(const w of pack.split(' ')){if(w.length>2&&t.includes(w))s+=5;}
 if(pack&&t.includes(pack))s+=40;
 return s;
}
async function addPanel(card){
 if(card.querySelector('.ai-route-panel')||!mismatch(card))return;
 const client=sb();if(!client)return;
 const id=card.dataset.pendingCandidate;
 const {data:c,error}=await client.from('quote_catalog_ai_candidates').select('id,catalog_product_id,discovered_title,edited_title').eq('id',id).single();
 if(error||!c)return;
 const title=c.edited_title||c.discovered_title||'';
 const {data:products,error:pe}=await client.from('quote_catalog_products').select('id,manufacturer,model,package_name,package_key,active').eq('active',true).limit(5000);if(pe)return;
 const choices=(products||[]).filter(p=>String(p.id)!==String(c.catalog_product_id)).map(p=>({p,s:score(title,p)})).sort((a,b)=>b.s-a.s||String(a.p.model).localeCompare(String(b.p.model)));
 const panel=document.createElement('section');panel.className='ai-route-panel';
 const reviewWrong=card.querySelector('[data-review-outcome="product_match"]')?.value==='wrong';
 panel.innerHTML='<strong>VALID EVIDENCE — WRONG TARGET DETECTED</strong><small>'+(reviewWrong?'You marked PRODUCT / MODEL / PACKAGE as AI WAS WRONG. The finding is being kept — choose the correct catalogue product below.':'This finding is being kept. Move it to the correct catalogue product instead of denying valid research.')+'</small><div class="ai-route-row"><input class="ai-route-search" type="search" placeholder="Search catalogue by manufacturer, model, package or keyword…"><select><option value="">Choose the correct catalogue product…</option></select><button type="button" class="btn btn-secondary">MOVE TO CORRECT PRODUCT</button></div><span class="ai-route-status" aria-live="polite"></span>';
 const search=panel.querySelector('.ai-route-search'),select=panel.querySelector('select'),button=panel.querySelector('button'),status=panel.querySelector('.ai-route-status');
 const renderChoices=term=>{
   const needle=norm(term);
   const filtered=choices.filter(({p})=>{
     if(!needle)return true;
     return norm([p.manufacturer,p.model,p.package_name,p.package_key].filter(Boolean).join(' ')).includes(needle);
   });
   const previous=select.value;
   select.innerHTML='<option value="">'+(filtered.length?'Choose the correct catalogue product…':'No matching catalogue products found')+'</option>'+filtered.map(({p,s})=>'<option value="'+esc(p.id)+'"'+(s>0?' data-score="'+s+'"':'')+'>'+esc([p.manufacturer,p.model,p.package_name||p.package_key].filter(Boolean).join(' · '))+'</option>').join('');
   if(previous&&filtered.some(({p})=>String(p.id)===String(previous)))select.value=previous;
 };
 renderChoices('');
 search.addEventListener('input',()=>renderChoices(search.value));
 button.addEventListener('click',async()=>{const target=select.value;if(!target){status.textContent='Choose the correct catalogue product first.';status.className='ai-route-status error';return;}button.disabled=true;status.textContent='Moving valid evidence to the selected product…';status.className='ai-route-status';try{const {error}=await client.rpc('reassign_ai_candidate',{p_candidate_id:id,p_target_catalog_product_id:target,p_reason:'Manual routing of valid evidence from package/model mismatch'});if(error)throw error;status.textContent='Moved. Reloading the pending review queue…';status.className='ai-route-status ok';setTimeout(()=>location.reload(),500);}catch(e){status.textContent=e.message||String(e);status.className='ai-route-status error';button.disabled=false;}});
 const checks=card.querySelector('.catalog-pending-checks');if(checks)checks.before(panel);else card.querySelector('.catalog-pending-editor-grid')?.after(panel);
}
function watch(card){if(card.dataset.aiRouteWatch)return;card.dataset.aiRouteWatch='1';const refresh=()=>{const panel=card.querySelector('.ai-route-panel');if(mismatch(card)){if(!panel)addPanel(card);}else panel?.remove();};card.addEventListener('change',e=>{if(e.target.matches('[data-field="edited_package_match"],[data-field="edited_variant_match"],[data-review-outcome="product_match"]'))refresh();});}
function scan(){style();document.querySelectorAll('[data-pending-candidate]').forEach(card=>{watch(card);addPanel(card);});}
const mo=new MutationObserver(()=>scan());mo.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
})();