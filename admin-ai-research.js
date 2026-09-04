(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),clean=v=>String(v??'').trim();
let sb,candidates=[],products=[],sources=[];
const msg=(t,e=false)=>{const x=$('ai-message');if(x){x.textContent=t;x.className='form-message '+(e?'error':'success')}};
const sourceMsg=(t,e=false)=>{const x=$('ai-sources-message');if(x){x.textContent=t;x.className='form-message '+(e?'error':'success')}};
const checked=()=>[...document.querySelectorAll('.candidate-check:checked')].map(x=>x.value);
const productFor=c=>products.find(x=>String(x.id)===String(c.catalog_product_id));
const pname=c=>{const p=productFor(c);return p?[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' · '):'Catalogue product not loaded'};
async function initClient(){if(!window.actionBuyerAuth?.supabase)throw Error('Supabase authentication is not ready.');sb=window.actionBuyerAuth.supabase;const s=await window.actionBuyerAuth.getSession();if(!s?.user)throw Error('Please sign in again.')}
async function api(body){const {data,error}=await sb.functions.invoke('quote-catalog-ai-orchestrator',{body});if(error)throw error;if(data?.error)throw Error(data.error);return data}
function renderMemory(rows){const el=$('ai-memory');if(!el)return;el.innerHTML=!rows.length?'<p>No review learning has been recorded yet.</p>':'<div style="overflow-x:auto"><table class="ai-table"><thead><tr><th>Type</th><th>Key</th><th>Category</th><th>Confidence</th><th>Updated</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.learning_type)+'</td><td>'+esc(r.learning_key)+'</td><td>'+esc(r.evidence_category||'—')+'</td><td>'+esc(r.confidence??'—')+'</td><td>'+esc(r.updated_at?new Date(r.updated_at).toLocaleString('en-GB'):'—')+'</td></tr>').join('')+'</tbody></table></div>'}
function render(){
 const body=$('ai-candidates');if(!body)return;
 if(!candidates.length){body.innerHTML='<div class="ai-empty-state">No proposed AI findings yet.</div>';return}
 body.innerHTML=candidates.map(c=>{
   const p=productFor(c);
   const title=c.edited_title??c.discovered_title??'—';
   const price=c.edited_price??c.price;
   const condition=c.edited_condition??c.condition??'—';
   const url=c.edited_source_url??c.source_url;
   const match=c.match_confidence==null?'—':Math.round(Number(c.match_confidence)*100)+'%';
   const decision=c.applied_at?'applied':(c.decision||'pending');
   const category=c.evidence_category||c.price_type||'Unclassified';
   const source=url?(()=>{try{return new URL(url).hostname.replace(/^www\\./,'')}catch{return url}})():'—';
   const productTitle=p?[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' · '):'Catalogue product unavailable';
   const productMeta=p?[p.category,p.product_type].filter(Boolean).join(' · '):'Product ID '+String(c.catalog_product_id||'—');
   return '<article class="ai-review-card">'
     +'<div class="ai-review-select"><input type="checkbox" class="candidate-check" value="'+esc(c.id)+'" aria-label="Select this finding"></div>'
     +'<div class="ai-review-product"><p class="section-kicker">CATALOGUE PRODUCT</p><h3>'+esc(productTitle)+'</h3><p>'+esc(productMeta)+'</p></div>'
     +'<div class="ai-review-evidence">'
       +'<div class="ai-review-badges"><span class="ai-badge">'+esc(category)+'</span><span class="ai-badge ai-badge-muted">'+esc(decision)+'</span></div>'
       +'<h3>'+esc(title)+'</h3>'
       +'<div class="ai-review-details"><span><strong>Price</strong> '+esc(c.currency||'GBP')+' '+esc(price??'—')+'</span><span><strong>Condition</strong> '+esc(condition)+'</span><span><strong>Match</strong> '+esc(match)+'</span></div>'
       +(c.evidence_notes?'<p class="ai-review-notes">'+esc(c.evidence_notes)+'</p>':'')
       +'<div class="ai-review-source"><strong>Source:</strong> '+esc(source)+(url?' · <a href="'+esc(url)+'" target="_blank" rel="noopener">OPEN EVIDENCE</a>':'')+'</div>'
     +'</div>'
     +'<div class="ai-review-actions"><button type="button" class="btn btn-secondary ai-edit" data-id="'+esc(c.id)+'">EDIT FINDING</button></div>'
   +'</article>';
 }).join('');
}
function renderSources(){const body=$('ai-sources');if(!body)return;const rows=sources.filter(s=>s.discovery_status==='discovered'||s.discovery_status==='blocked'||s.discovered_at);if(!rows.length){body.innerHTML='<tr><td colspan="8">No newly discovered sources yet.</td></tr>';return}body.innerHTML=rows.map(s=>'<tr><td><strong>'+esc(s.source_name)+'</strong><br><small>'+esc(s.domain)+'</small></td><td>'+esc(s.country_code||'—')+'</td><td>'+esc(s.source_kind||'—')+'</td><td>'+esc(s.research_scope||'—')+'</td><td>'+esc(s.discovered_at?new Date(s.discovered_at).toLocaleDateString('en-GB'):'—')+'</td><td>'+esc(s.discovery_count??0)+'</td><td>'+esc(s.discovery_status||'approved')+'</td><td><button class="btn btn-primary source-action" data-id="'+esc(s.id)+'" data-status="approved" type="button">APPROVE</button> <button class="btn btn-secondary source-action" data-id="'+esc(s.id)+'" data-status="blocked" type="button">BLOCK</button></td></tr>').join('')}
function fillSelect(id,values,placeholder){const el=$(id);if(!el)return;const current=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');el.value=current}
function populateResearchFilters(){fillSelect('research-manufacturer',products.map(p=>p.manufacturer),'Any manufacturer');fillSelect('research-category',products.map(p=>p.category),'Any category');fillSelect('research-product-type',products.map(p=>p.product_type),'Any product type')}
async function load(){
 const [c,allProducts,m]=await Promise.all([
   sb.from('quote_catalog_ai_candidates').select('*').order('created_at',{ascending:false}).limit(500),
   sb.from('quote_catalog_products').select('id,manufacturer,model,package_name,category,product_type').limit(10000),
   sb.from('quote_catalog_ai_learning').select('*').eq('active',true).order('updated_at',{ascending:false}).limit(100)
 ]);
 if(c.error)throw c.error;if(allProducts.error)throw allProducts.error;if(m.error)throw m.error;
 candidates=c.data||[];
 const candidateProductIds=[...new Set(candidates.map(x=>x.catalog_product_id).filter(Boolean))];
 let candidateProducts=[];
 if(candidateProductIds.length){
   const r=await sb.from('quote_catalog_products').select('id,manufacturer,model,package_name,category,product_type').in('id',candidateProductIds);
   if(r.error)throw r.error;
   candidateProducts=r.data||[];
 }
 const byId=new Map();
 [...(allProducts.data||[]),...candidateProducts].forEach(p=>byId.set(String(p.id),p));
 products=[...byId.values()];
 populateResearchFilters();render();renderMemory(m.data||[])
}
async function loadSources(){const data=await api({action:'source_registry'});sources=data.sources||[];renderSources()}
async function loadAgentStatus(){
 const el=$('local-ai-status');if(!el)return;
 const data=await api({action:'agent_status'});const a=(data.agents||[])[0];
 if(!a){el.textContent='LOCAL AI WORKER OFFLINE — queued research will wait until the research PC agent is running.';el.className='form-message error';return}
 const age=a.last_heartbeat_at?Date.now()-new Date(a.last_heartbeat_at).getTime():Infinity;
 const online=age<90000&&['online','working','starting'].includes(a.status);
 el.textContent=(online?'LOCAL AI WORKER ONLINE':'LOCAL AI WORKER OFFLINE')+' · '+(a.model||'Ollama model not reported')+(a.status==='working'?' · currently researching':'')+(a.last_error?' · last error: '+a.last_error:'');
 el.className='form-message '+(online?'success':'error');
}
async function runResearch(){
 const b=$('run-ai-research');if(b){b.disabled=true;b.textContent='RESEARCHING…'}
 const body={limit:Number($('research-limit')?.value||5),manufacturer:clean($('research-manufacturer')?.value||''),model:clean($('research-model')?.value||''),category:clean($('research-category')?.value||''),product_type:clean($('research-product-type')?.value||''),evidence_scope:clean($('research-evidence-scope')?.value||'all')};
 const scope=[body.manufacturer,body.model,body.category,body.product_type].filter(Boolean).join(' · ')||'next available products';
 const evidenceLabel={all:'all evidence types',new_uk:'new UK retail evidence',used_uk:'used UK / UK marketplace evidence',overseas:'overseas evidence'}[body.evidence_scope]||'all evidence types';
 msg('AI research started for '+scope+' · '+evidenceLabel+'. Findings will go to manual review only.');
 try{
   const {data,error}=await sb.functions.invoke('quote-catalog-ai-worker',{body});
   if(error){
     const detail=error.context&&typeof error.context.text==='function'?await error.context.text().catch(()=>null):null;
     throw Error(detail||error.message||'AI research request failed');
   }
   if(data?.error)throw Error(data.error);
   const r=data||{};
   if(r.status==='queued_for_local_agent'){
     msg(r.message||((r.products_queued||0)+' product(s) queued for the local Ollama worker. Refresh the review queue after processing.'),false);
   }else{
     msg(r.message||'Research request queued.',false);
   }
   await Promise.all([load(),loadSources(),loadAgentStatus()]);
 }finally{if(b){b.disabled=false;b.textContent='RUN SELECTED AI RESEARCH'}}
}
async function edit(id){const c=candidates.find(x=>x.id===id);if(!c)return;const title=prompt('Listing title',c.edited_title??c.discovered_title??'');if(title===null)return;const price=prompt('Price',String(c.edited_price??c.price??''));if(price===null)return;const condition=prompt('Condition',c.edited_condition??c.condition??'');if(condition===null)return;const url=prompt('Source URL',c.edited_source_url??c.source_url??'');if(url===null)return;const n=clean(price)===''?null:Number(price);if(n!==null&&!Number.isFinite(n))throw Error('Price must be a valid number.');const {error}=await sb.from('quote_catalog_ai_candidates').update({edited_title:clean(title)||null,edited_price:n,edited_condition:clean(condition)||null,edited_source_url:clean(url)||null,reviewed_at:new Date().toISOString()}).eq('id',id);if(error)throw error;msg('Evidence entry updated.');await load()}
async function decide(decision){const ids=checked();if(!ids.length)throw Error('Select at least one evidence entry first.');const {error}=await sb.from('quote_catalog_ai_candidates').update({decision,decision_reason:'Manual review in AI Research Centre',reviewed_at:new Date().toISOString()}).in('id',ids);if(error)throw error;msg(ids.length+' evidence entr'+(ids.length===1?'y':'ies')+' marked '+decision+'.');await load()}
async function apply(){const ids=checked();if(!ids.length)throw Error('Select accepted evidence first.');let done=0;for(const id of ids){const c=candidates.find(x=>x.id===id);if(c?.decision!=='accepted'||c.applied_at)continue;const {error}=await sb.rpc('apply_accepted_ai_candidate',{p_candidate_id:id});if(error)throw error;done++}msg(done?done+' accepted evidence entr'+(done===1?'y has':'ies have')+' been applied to live evidence.':'Only newly accepted entries can be applied.',!done);await load()}
async function updateSource(id,status){await api({action:'update_source',source_id:id,discovery_status:status});sourceMsg(status==='approved'?'Source approved and enabled for future research.':'Source blocked from future research.');await loadSources()}
async function start(){try{await initClient();$('run-ai-research')?.addEventListener('click',()=>runResearch().catch(e=>msg(e.message||String(e),true)));$('clear-research-filters')?.addEventListener('click',()=>{['research-manufacturer','research-model','research-category','research-product-type','research-evidence-scope'].forEach(id=>{if($(id))$(id).value=(id==='research-evidence-scope'?'all':'')});});$('refresh-ai')?.addEventListener('click',()=>load().then(()=>msg('Review queue refreshed.')).catch(e=>msg(e.message,true)));$('refresh-sources')?.addEventListener('click',()=>loadSources().then(()=>sourceMsg('Research sources refreshed.')).catch(e=>sourceMsg(e.message,true)));$('accept-selected')?.addEventListener('click',()=>decide('accepted').catch(e=>msg(e.message,true)));$('deny-selected')?.addEventListener('click',()=>decide('rejected').catch(e=>msg(e.message,true)));$('apply-selected')?.addEventListener('click',()=>apply().catch(e=>msg(e.message,true)));document.addEventListener('click',e=>{const b=e.target.closest('.ai-edit');if(b)edit(b.dataset.id).catch(x=>msg(x.message,true));const s=e.target.closest('.source-action');if(s)updateSource(s.dataset.id,s.dataset.status).catch(x=>sourceMsg(x.message,true))});await Promise.all([load(),loadSources(),loadAgentStatus()]);msg('Review queue loaded.');setInterval(()=>loadAgentStatus().catch(()=>{}),30000)}catch(e){msg(e.message||String(e),true);sourceMsg(e.message||String(e),true)}}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start()})();