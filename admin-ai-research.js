(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),clean=v=>String(v??'').trim();
let sb,candidates=[],products=[],sources=[],productCandidates=[],editingId=null,selectedCandidateIds=new Set();
const msg=(t,e=false)=>{const x=$('ai-message');if(x){x.textContent=t;x.className='form-message '+(e?'error':'success')}};
const sourceMsg=(t,e=false)=>{const x=$('ai-sources-message');if(x){x.textContent=t;x.className='form-message '+(e?'error':'success')}};
const checked=()=>[...selectedCandidateIds];
const rememberSelection=()=>{document.querySelectorAll('.candidate-check').forEach(x=>{if(x.checked)selectedCandidateIds.add(String(x.value);else selectedCandidateIds.delete(String(x.value));});};
const productFor=c=>products.find(x=>String(x.id)===String(c.catalog_product_id));
const pname=c=>{const p=productFor(c);return p?[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' · '):'Catalogue product not loaded'};
async function initClient(){if(!window.actionBuyerAuth?.supabase)throw Error('Supabase authentication is not ready.');sb=window.actionBuyerAuth.supabase;const s=await window.actionBuyerAuth.getSession();if(!s?.user)throw Error('Please sign in again.')}
async function api(body){const {data,error}=await sb.functions.invoke('quote-catalog-ai-orchestrator',{body});if(error)throw error;if(data?.error)throw Error(data.error);return data}
function renderProductCandidateCard(c){
 const matches=Array.isArray(c.duplicate_matches)?c.duplicate_matches:[];
 const duplicate=c.duplicate_status==='likely_duplicate';
 return '<article class="ai-review-card ai-product-candidate">'
  +'<div class="ai-review-product"><p class="section-kicker">NEW PRODUCT CANDIDATE</p><h3>'+esc(c.proposed_title||[c.manufacturer,c.model,c.package_name].filter(Boolean).join(' · ')||'Unnamed product')+'</h3><p>'+esc([c.main_category,c.product_type].filter(Boolean).join(' · ')||'Category still required')+'</p></div>'
  +'<div class="ai-review-evidence"><div class="ai-review-badges"><span class="ai-badge">'+esc(c.duplicate_status||'unchecked').replaceAll('_',' ').toUpperCase()+'</span><span class="ai-badge ai-badge-muted">MANUAL REVIEW ONLY</span></div>'
  +'<div class="ai-review-details"><span><strong>Manufacturer</strong> '+esc(c.manufacturer||'—')+'</span><span><strong>Model</strong> '+esc(c.model||'—')+'</span><span><strong>Package</strong> '+esc(c.package_name||'—')+'</span></div>'
  +(matches.length?'<p class="ai-review-notes"><strong>Possible existing matches:</strong> '+esc(matches.map(m=>[m.manufacturer,m.model,m.package_name].filter(Boolean).join(' · ')).join(' | '))+'</p>':'')
  +(c.evidence_notes?'<p class="ai-review-notes">'+esc(c.evidence_notes)+'</p>':'')
  +(c.discovery_source_url?'<div class="ai-review-source"><strong>Discovery source:</strong> '+esc(c.discovery_source_name||'—')+' · <a href="'+esc(c.discovery_source_url)+'" target="_blank" rel="noopener">OPEN SOURCE</a></div>':'')
  +'</div>'
  +'<div class="ai-review-actions">'
  +(c.decision==='pending'?'<button type="button" class="btn btn-primary ai-product-candidate-accept" data-id="'+esc(c.id)+'">APPROVE FOR CATALOGUE</button><button type="button" class="btn btn-secondary ai-product-candidate-reject" data-id="'+esc(c.id)+'">REJECT</button>':'')
  +(c.decision==='accepted'?'<button type="button" class="btn btn-primary ai-product-candidate-create" data-id="'+esc(c.id)+'">CREATE DRAFT CATALOGUE PRODUCT</button>':'')
  +(c.decision==='catalogue_created'?'<span class="ai-badge">DRAFT CREATED</span>':'')
  +'</div></article>';
}
function renderProductCandidates(){
 const body=$('ai-product-candidates');if(!body)return;
 if(!productCandidates.length){body.innerHTML='<div class="ai-empty-state">No new product candidates have been found yet.</div>';return}
 const pending=productCandidates.filter(c=>c.decision==='pending');
 const accepted=productCandidates.filter(c=>c.decision==='accepted');
 const rejected=productCandidates.filter(c=>c.decision==='rejected');
 const created=productCandidates.filter(c=>c.decision==='catalogue_created');
 body.innerHTML='<div class="ai-current-findings"><div class="ai-current-findings-heading"><p class="section-kicker">NEW MODELS</p><h2>New product candidates</h2><p>Nothing here is automatically added to the catalogue. Review duplicates first, then explicitly approve and create a draft product.</p></div>'+pending.map(renderProductCandidateCard).join('')+'</div>'
 +renderSection('Approved product candidates','These are approved for creation as draft catalogue products only.',accepted,'accepted',false).replace(/<article class="ai-review-card">[\s\S]*?<\/article>/g,'')
 +(accepted.length?'<div class="ai-decision-section-content">'+accepted.map(renderProductCandidateCard).join('')+'</div>':'')
 +(rejected.length?'<details class="ai-decision-section ai-decision-rejected"><summary><div><p class="section-kicker">REJECTED</p><h2>Rejected product candidates <span class="ai-decision-count">'+rejected.length+'</span></h2></div><span class="ai-decision-toggle">VIEW</span></summary><div class="ai-decision-section-content">'+rejected.map(renderProductCandidateCard).join('')+'</div></details>':'')
 +(created.length?'<details class="ai-decision-section ai-decision-applied"><summary><div><p class="section-kicker">DRAFTS CREATED</p><h2>Catalogue drafts <span class="ai-decision-count">'+created.length+'</span></h2></div><span class="ai-decision-toggle">VIEW</span></summary><div class="ai-decision-section-content">'+created.map(renderProductCandidateCard).join('')+'</div></details>':'');
}
async function decideProductCandidate(id,decision){
 const {error}=await sb.from('quote_catalog_ai_product_candidates').update({decision,decision_reason:'Manual review in AI Research Centre',reviewed_at:new Date().toISOString()}).eq('id',id);
 if(error)throw error;msg('Product candidate '+decision+'.');await load();
}
async function createCatalogueDraft(id){
 const {data,error}=await sb.rpc('ai_research_create_catalogue_product_from_candidate',{p_candidate_id:id});
 if(error)throw error;
 msg('Draft catalogue product created. It remains inactive and not customer-visible until you complete and approve it.');
 await load();
}

function renderMemory(rows){const el=$('ai-memory');if(!el)return;el.innerHTML=!rows.length?'<p>No review learning has been recorded yet.</p>':'<div style="overflow-x:auto"><table class="ai-table"><thead><tr><th>Type</th><th>Key</th><th>Category</th><th>Confidence</th><th>Updated</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.learning_type)+'</td><td>'+esc(r.learning_key)+'</td><td>'+esc(r.evidence_category||'—')+'</td><td>'+esc(r.confidence??'—')+'</td><td>'+esc(r.updated_at?new Date(r.updated_at).toLocaleString('en-GB'):'—')+'</td></tr>').join('')+'</tbody></table></div>'}
function editorMarkup(c){
 const title=c.edited_title??c.discovered_title??'';
 const price=c.edited_price??c.price??'';
 const condition=c.edited_condition??c.condition??'';
 const url=c.edited_source_url??c.source_url??'';
 const category=c.edited_evidence_category??c.evidence_category??c.price_type??'';
 const availability=c.edited_availability_status??c.availability_status??'';
 const packageMatch=c.edited_package_match??c.package_match??'';
 const variantMatch=c.edited_variant_match??c.variant_match??'';
 const confidence=c.edited_match_confidence??c.match_confidence??'';
 const sourceKind=c.edited_source_kind??c.source_kind??'';
 const notes=c.edited_evidence_notes??c.evidence_notes??'';
 return '<section class="ai-inline-editor" data-editor-id="'+esc(c.id)+'">'
   +'<div class="ai-editor-heading"><div><p class="section-kicker">CATALOGUE-STYLE EDITOR</p><h3>Edit finding before approval</h3><p>Correct the evidence, add your comparison price and keep the exact product page before accepting it.</p></div></div>'
   +'<div class="ai-editor-grid">'
   +'<label>Listing title<input class="ai-field" data-field="edited_title" value="'+esc(title)+'"></label>'
   +'<label>Comparison price<input class="ai-field" data-field="edited_price" type="number" min="0" step="0.01" value="'+esc(price)+'"></label>'
   +'<label>Condition<input class="ai-field" data-field="edited_condition" value="'+esc(condition)+'" placeholder="New, Used, Refurbished…"></label>'
   +'<label>Evidence category<select class="ai-field" data-field="edited_evidence_category"><option value="">Select category</option>'+['new_uk','used_uk','overseas','retail','marketplace'].map(v=>'<option value="'+v+'"'+(String(category)===v?' selected':'')+'>'+v.replaceAll('_',' ').toUpperCase()+'</option>').join('')+'</select></label>'
   +'<label>Availability<input class="ai-field" data-field="edited_availability_status" value="'+esc(availability)+'"></label>'
   +'<label>Package match<input class="ai-field" data-field="edited_package_match" value="'+esc(packageMatch)+'"></label>'
   +'<label>Variant match<input class="ai-field" data-field="edited_variant_match" value="'+esc(variantMatch)+'"></label>'
   +'<label>Match confidence %<input class="ai-field" data-field="edited_match_confidence" type="number" min="0" max="100" step="1" value="'+esc(confidence===''?'':Number(confidence)<=1?Math.round(Number(confidence)*100):confidence)+'"></label>'
   +'<label>Source / retailer<input class="ai-field" data-field="edited_source_kind" value="'+esc(sourceKind)+'"></label>'
   +'<label class="ai-editor-wide">Exact product page URL<input class="ai-field" data-field="edited_source_url" type="url" value="'+esc(url)+'" placeholder="https://…"></label>'
   +'<label class="ai-editor-wide">Research notes<textarea class="ai-field" data-field="edited_evidence_notes" rows="4">'+esc(notes)+'</textarea></label>'
   +'</div>'
   +'<div class="ai-editor-actions"><button type="button" class="btn btn-primary ai-save-edit" data-id="'+esc(c.id)+'">SAVE FINDING</button><button type="button" class="btn btn-secondary ai-cancel-edit" data-id="'+esc(c.id)+'">CANCEL</button></div>'
   +'</section>';
}
function renderCandidateCard(c){
 const p=productFor(c);
 const title=c.edited_title??c.discovered_title??'—';
 const price=c.edited_price??c.price;
 const condition=c.edited_condition??c.condition??'—';
 const url=c.edited_source_url??c.source_url;
 const rawMatch=c.edited_match_confidence??c.match_confidence;
 const match=rawMatch==null||rawMatch===''?'—':Math.round(Number(rawMatch)<=1?Number(rawMatch)*100:Number(rawMatch))+'%';
 const decision=c.applied_at?'applied':(c.decision||'pending');
 const category=c.edited_evidence_category??c.evidence_category??c.price_type??'Unclassified';
 const source=url?(()=>{try{return new URL(url).hostname.replace(/^www\\./,'')}catch{return url}})():'—';
 const productTitle=p?[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' · '):'Catalogue product unavailable';
 const productMeta=p?[p.category,p.product_type].filter(Boolean).join(' · '):'Product ID '+String(c.catalog_product_id||'—');
 const open=editingId===c.id?' open':'';
 return '<article class="ai-review-card ai-finding-card">'
   +'<div class="ai-review-select"><input type="checkbox" class="candidate-check" value="'+esc(c.id)+'"'+(selectedCandidateIds.has(String(c.id))?' checked':'')+' aria-label="Select this finding"></div>'
   +'<details class="ai-finding-details"'+open+'>'
     +'<summary>'
       +'<div class="ai-finding-summary-copy">'
         +'<div class="ai-review-badges"><span class="ai-badge">'+esc(category)+'</span><span class="ai-badge ai-badge-muted">'+esc(decision)+'</span></div>'
         +'<h3>'+esc(productTitle)+'</h3>'
         +'<p class="ai-finding-summary-title">'+esc(title)+'</p>'
         +'<div class="ai-finding-summary-meta"><span><strong>Price</strong> '+esc(c.currency||'GBP')+' '+esc(price??'—')+'</span><span><strong>Condition</strong> '+esc(condition)+'</span><span><strong>Source</strong> '+esc(source)+'</span><span><strong>Match</strong> '+esc(match)+'</span></div>'
       +'</div>'
       +'<span class="ai-finding-toggle">VIEW</span>'
     +'</summary>'
     +'<div class="ai-finding-content">'
       +'<div class="ai-finding-body">'
         +'<div class="ai-review-product"><p class="section-kicker">CATALOGUE PRODUCT</p><h3>'+esc(productTitle)+'</h3><p>'+esc(productMeta)+'</p></div>'
         +'<div class="ai-review-evidence">'
           +'<div class="ai-review-badges"><span class="ai-badge">'+esc(category)+'</span><span class="ai-badge ai-badge-muted">'+esc(decision)+'</span></div>'
           +'<h3>'+esc(title)+'</h3>'
           +'<div class="ai-review-details"><span><strong>Price</strong> '+esc(c.currency||'GBP')+' '+esc(price??'—')+'</span><span><strong>Condition</strong> '+esc(condition)+'</span><span><strong>Availability</strong> '+esc(c.availability_status||'—')+'</span><span><strong>Match</strong> '+esc(match)+'</span><span><strong>Package</strong> '+esc(c.package_match||'—')+'</span><span><strong>Variant</strong> '+esc(c.variant_match||'—')+'</span></div>'
           +((c.edited_evidence_notes??c.evidence_notes)?'<p class="ai-review-notes">'+esc(c.edited_evidence_notes??c.evidence_notes)+'</p>':'')
           +'<div class="ai-review-source"><strong>Source:</strong> '+esc(source)+' · <strong>Type:</strong> '+esc(c.edited_source_kind??c.source_kind??'—')+(url?' · <a href="'+esc(url)+'" target="_blank" rel="noopener">OPEN EXACT PRODUCT PAGE</a>':'')+(url?'<br><small>'+esc(url)+'</small>':'')+'</div>'
         +'</div>'
         +'<div class="ai-review-actions"><button type="button" class="btn btn-secondary ai-edit" data-id="'+esc(c.id)+'">'+(editingId===c.id?'CLOSE EDITOR':'EDIT FINDING')+'</button></div>'
       +'</div>'
       +(editingId===c.id?editorMarkup(c):'')
     +'</div>'
   +'</details>'
 +'</article>';
}
function renderSection(title,description,rows,state,open){
 if(!rows.length)return '';
 return '<details class="ai-decision-section ai-decision-'+esc(state)+'"'+(open?' open':'')+'>'
   +'<summary><div><p class="section-kicker">'+esc(state.toUpperCase())+' FINDINGS</p><h2>'+esc(title)+' <span class="ai-decision-count">'+rows.length+'</span></h2><p>'+esc(description)+'</p></div><span class="ai-decision-toggle">VIEW</span></summary>'
   +'<div class="ai-decision-section-content">'+rows.map(renderCandidateCard).join('')+'</div>'
 +'</details>';
}
function render(){
 const body=$('ai-candidates');if(!body)return;
 if(!candidates.length){body.innerHTML='<div class="ai-empty-state">No proposed AI findings yet.</div>';return}
 const pending=candidates.filter(c=>!c.applied_at&&(c.decision||'pending')==='pending');
 const accepted=candidates.filter(c=>!c.applied_at&&c.decision==='accepted');
 const rejected=candidates.filter(c=>c.decision==='rejected');
 const applied=candidates.filter(c=>c.applied_at);
 let html='';
 if(pending.length){
   html+='<div class="ai-current-findings">'
     +'<div class="ai-current-findings-heading"><p class="section-kicker">PENDING REVIEW</p><h2>Findings awaiting a decision <span class="ai-decision-count">'+pending.length+'</span></h2><p>These are the active findings currently waiting for you to edit, accept or reject.</p></div>'
     +pending.map(renderCandidateCard).join('')
   +'</div>';
 }else{
   html+='<div class="ai-empty-state">No findings are currently awaiting review.</div>';
 }
 html+=renderSection('Accepted findings','Accepted evidence is kept separate here until you apply it to the live evidence catalogue.',accepted,'accepted',false);
 html+=renderSection('Rejected findings','Rejected evidence is retained separately for audit and can still be opened and reviewed if needed.',rejected,'rejected',false);
 if(applied.length)html+=renderSection('Applied to live evidence','These accepted findings have already been applied to the live evidence catalogue.',applied,'applied',false);
 body.innerHTML=html;
}
function renderSources(){
 const body=$('ai-sources');if(!body)return;
 const rows=sources.filter(s=>s.discovery_status==='discovered'||s.discovery_status==='blocked'||s.discovered_at||s.monitor_for_opening);
 if(!rows.length){body.innerHTML='<tr><td colspan="8">No newly discovered or monitored sources yet.</td></tr>';return}
 body.innerHTML=rows.map(s=>{
   const opened=s.opened_at?new Date(s.opened_at).toLocaleDateString('en-GB'):null;
   const openingSoon=s.opening_soon_detected_at?new Date(s.opening_soon_detected_at).toLocaleDateString('en-GB'):null;
   const found=opened?'LIVE '+opened:(openingSoon?'OPENING SOON '+openingSoon:(s.discovered_at?new Date(s.discovered_at).toLocaleDateString('en-GB'):'—'));
   const status=s.monitor_for_opening
     ?(s.site_status==='live'?'LIVE — opened '+(opened||'date pending'):'MONITORING — '+String(s.site_status||'unknown').replaceAll('_',' ').toUpperCase())
     :esc(s.discovery_status||'approved');
   const actions=s.monitor_for_opening
     ?'<span class="ai-badge">'+(s.site_status==='live'?'ACTIVE':'WATCHING FOR OPENING')+'</span>'
     :'<button class="btn btn-primary source-action" data-id="'+esc(s.id)+'" data-status="approved" type="button">APPROVE</button> <button class="btn btn-secondary source-action" data-id="'+esc(s.id)+'" data-status="blocked" type="button">BLOCK</button>';
   return '<tr><td><strong>'+esc(s.source_name)+'</strong><br><small>'+esc(s.domain)+'</small>'+(s.status_note?'<br><small>'+esc(s.status_note)+'</small>':'')+'</td><td>'+esc(s.country_code||'—')+'</td><td>'+esc(s.source_kind||'—')+'</td><td>'+esc(s.research_scope||'—')+'</td><td>'+esc(found)+'</td><td>'+esc(s.discovery_count??0)+'</td><td>'+status+'</td><td>'+actions+'</td></tr>';
 }).join('');
}
function fillSelect(id,values,placeholder){const el=$(id);if(!el)return;const current=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');el.value=current}
function populateResearchFilters(){fillSelect('research-manufacturer',products.map(p=>p.manufacturer),'Any manufacturer');fillSelect('research-category',products.map(p=>p.category),'Any category');fillSelect('research-product-type',products.map(p=>p.product_type),'Any product type')}
async function load(){
 const [c,allProducts,m,pc]=await Promise.all([
   sb.from('quote_catalog_ai_candidates').select('*').order('created_at',{ascending:false}).limit(500),
   sb.from('quote_catalog_products').select('id,manufacturer,model,package_name,category,product_type').limit(10000),
   sb.from('quote_catalog_ai_learning').select('*').eq('active',true).order('updated_at',{ascending:false}).limit(100),
   sb.from('quote_catalog_ai_product_candidates').select('*').order('created_at',{ascending:false}).limit(500)
 ]);
 if(c.error)throw c.error;if(allProducts.error)throw allProducts.error;if(m.error)throw m.error;if(pc.error)throw pc.error;
 productCandidates=pc.data||[];
 candidates=c.data||[];
 selectedCandidateIds=new Set([...selectedCandidateIds].filter(id=>candidates.some(c=>String(c.id)===String(id))));
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
 populateResearchFilters();render();renderProductCandidates();renderMemory(m.data||[])
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
function setResearchScope(scope){
 const select=$('research-evidence-scope');
 const allowed=['all','new_uk','used_uk','overseas'];
 const value=allowed.includes(scope)?scope:'all';
 if(select)select.value=value;
 document.querySelectorAll('.ai-scope-option').forEach(b=>{
   const selected=b.dataset.scope===value;
   b.classList.toggle('is-selected',selected);
   b.setAttribute('aria-pressed',selected?'true':'false');
 });
}
async function loadResearchPcControl(){
 const {data:agents,error}=await sb.from('quote_catalog_ai_agents').select('*').order('updated_at',{ascending:false}).limit(1);
 if(error)return;
 const a=agents?.[0]; const now=Date.now(); const fresh=a?.last_heartbeat_at&&now-new Date(a.last_heartbeat_at).getTime()<90000;
 const active=fresh&&['online','working','starting'].includes(String(a?.status||'').toLowerCase());
 const pill=$('rpc-status-pill'); if(pill){pill.textContent=active?'ONLINE':'OFFLINE';pill.className='rpc-status '+(active?'online':'offline');}
 if($('rpc-worker'))$('rpc-worker').textContent=active?(a.status||'ONLINE').toUpperCase():'OFFLINE';
 if($('rpc-ollama'))$('rpc-ollama').textContent=active?'CONNECTED':'CHECK REQUIRED';
 if($('rpc-model'))$('rpc-model').textContent=a?.model||'—';
 if($('rpc-error'))$('rpc-error').textContent=a?.last_error||'None reported';
}
async function requestResearchPcCommand(command){
 const {data:agents,error:aErr}=await sb.from('quote_catalog_ai_agents').select('agent_id').order('updated_at',{ascending:false}).limit(1);
 if(aErr)throw aErr;
 const agentId=agents?.[0]?.agent_id||'gear-local-agent-1';
 const {data,error}=await sb.rpc('ai_agent_request_command',{p_agent_id:agentId,p_command:command});
 if(error)throw error;
 msg('Research PC command sent: '+command.replace(/_/g,' ')+'.');
 return data;
}

async function loadLiveResearch(){
 const box=$('live-research-list'); if(!box)return;
 const {data:rows,error}=await sb.from('quote_catalog_ai_queue')
   .select('id,status,attempts,claimed_at,updated_at,catalog_product_id,run_id')
   .in('status',['processing','claimed','queued']).order('updated_at',{ascending:false}).limit(8);
 if(error){box.innerHTML='<div class="empty">Live research activity could not be loaded: '+esc(error.message||String(error))+'</div>';return;}
 if(!rows?.length){box.innerHTML='<div class="empty">No active research. Start a batch or continuous catalogue research.</div>';return;}
 const productIds=[...new Set(rows.map(r=>r.catalog_product_id).filter(Boolean))];
 const runIds=[...new Set(rows.map(r=>r.run_id).filter(Boolean))];
 const [productResult,runResult]=await Promise.all([
   productIds.length?sb.from('quote_catalog_products').select('id,manufacturer,model,package_name').in('id',productIds):Promise.resolve({data:[],error:null}),
   runIds.length?sb.from('quote_catalog_ai_research_runs').select('id,notes,evidence_scope,status').in('id',runIds):Promise.resolve({data:[],error:null})
 ]);
 if(productResult.error||runResult.error){
   const detail=(productResult.error||runResult.error).message||'Unknown database error';
   box.innerHTML='<div class="empty">Live research activity could not be loaded: '+esc(detail)+'</div>';return;
 }
 const productsById=new Map((productResult.data||[]).map(p=>[String(p.id),p]));
 const runsById=new Map((runResult.data||[]).map(r=>[String(r.id),r]));
 box.innerHTML=rows.map((r,i)=>{
   const p=productsById.get(String(r.catalog_product_id))||{};
   const run=runsById.get(String(r.run_id))||{};
   const name=[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' ')||'Catalogue product';
   const state=(r.status||'queued').toUpperCase();
   const scope=(run.evidence_scope||'all').replaceAll('_',' ');
   const when=r.updated_at||r.claimed_at;
   return '<article class="live-research-item">'
     +'<div class="live-research-index">'+(i+1)+'</div>'
     +'<div><strong>'+esc(name)+'</strong><span>'+esc(state)+' · '+esc(scope.toUpperCase())+(when?' · '+esc(new Date(when).toLocaleTimeString('en-GB')):'')+'</span></div>'
     +'</article>';
 }).join('');
}
async function loadRawDiscoveries(){
 const box=$('raw-discovery-list');if(!box)return;
 const {data,error}=await sb.rpc('ai_research_recent_discoveries',{p_limit:80});
 if(error){box.innerHTML='<div class="empty">Found results could not be loaded: '+esc(error.message||String(error))+'</div>';return;}
 const rows=Array.isArray(data)?data:[];
 if(!rows.length){box.innerHTML='<div class="empty">No web results have been recorded yet. New searches will appear here before validation.</div>';return;}
 box.innerHTML=rows.map(d=>{
   const name=[d.manufacturer,d.model,d.package_name].filter(Boolean).join(' ')||'Catalogue product';
   const when=d.created_at?new Date(d.created_at).toLocaleString('en-GB'):'—';
   const title=d.discovered_title||d.host||'Untitled result';
   const status=(d.discovery_status||'found').toUpperCase();
   const scope=(d.evidence_scope||'all').replaceAll('_',' ').toUpperCase();
   return '<article class="raw-discovery-row">'
     +'<strong>'+esc(name)+' · '+esc(status)+'</strong>'
     +'<span>'+esc(title)+'</span>'
     +'<a href="'+esc(d.source_url||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(d.source_url||d.host||'Open result')+'</a>'
     +'<span class="raw-discovery-meta">'+esc(scope)+' · '+esc(d.source_provider||'direct')+' · '+esc(when)+'</span>'
   +'</article>';
 }).join('');
}
async function loadContinuousResearch(){
 const status=$('continuous-research-status');if(!status)return;
 const {data,error}=await sb.rpc('ai_research_get_continuous');if(error)throw error;
 const c=data||{}; const on=!!c.enabled;
 status.textContent=on?'CONTINUOUS RESEARCH RUNNING · '+(c.mode==='oldest_checked'?'oldest evidence timestamps first':'lowest evidence first')+' · '+(c.evidence_scope||'all'):'CONTINUOUS RESEARCH STOPPED';
 status.className='form-message '+(on?'success':'');
 const start=$('start-continuous-research'),stop=$('stop-continuous-research');
 if(start)start.disabled=on;if(stop)stop.disabled=!on;
}
async function setContinuousResearch(enabled){
 const mode=clean($('continuous-research-mode')?.value||'low_evidence');
 const scope=clean($('research-evidence-scope')?.value||'all');
 const {data,error}=await sb.rpc('ai_research_set_continuous',{p_enabled:enabled,p_mode:mode,p_evidence_scope:scope,p_manufacturer:clean($('research-manufacturer')?.value||'' )||null,p_category:clean($('research-category')?.value||'')||null,p_product_type:clean($('research-product-type')?.value||'')||null});
 if(error)throw error;
 msg(enabled?'Continuous catalogue research started. The PC will keep taking the next product until you press STOP.':'Continuous catalogue research stopped. The current product may finish, but no further products will be taken.');
 await loadContinuousResearch();
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
function edit(id){editingId=editingId===id?null:id;render();}
async function saveEdit(id){
 const editor=document.querySelector('[data-editor-id="'+CSS.escape(String(id))+'"]');
 if(!editor)throw Error('Editor not found.');
 const value=name=>clean(editor.querySelector('[data-field="'+name+'"]')?.value||'');
 const priceText=value('edited_price');
 const price=priceText===''?null:Number(priceText);
 if(price!==null&&!Number.isFinite(price))throw Error('Comparison price must be a valid number.');
 const confidenceText=value('edited_match_confidence');
 let confidence=confidenceText===''?null:Number(confidenceText);
 if(confidence!==null){
   if(!Number.isFinite(confidence)||confidence<0||confidence>100)throw Error('Match confidence must be between 0 and 100.');
   confidence=confidence/100;
 }
 const url=value('edited_source_url');
 if(url){try{new URL(url)}catch{throw Error('Please enter a valid exact product page URL.');}}
 const payload={
   edited_title:value('edited_title')||null,
   edited_price:price,
   edited_condition:value('edited_condition')||null,
   edited_source_url:url||null,
   edited_evidence_category:value('edited_evidence_category')||null,
   edited_availability_status:value('edited_availability_status')||null,
   edited_package_match:value('edited_package_match')||null,
   edited_variant_match:value('edited_variant_match')||null,
   edited_match_confidence:confidence,
   edited_source_kind:value('edited_source_kind')||null,
   edited_evidence_notes:value('edited_evidence_notes')||null,
   reviewed_at:new Date().toISOString()
 };
 const {error}=await sb.from('quote_catalog_ai_candidates').update(payload).eq('id',id);
 if(error)throw error;
 editingId=null;
 msg('Finding saved. You can now accept it and apply it to the live evidence catalogue.');
 await load();
}
async function decide(decision){rememberSelection();const ids=checked();if(!ids.length)throw Error('Select at least one evidence entry first.');const {error}=await sb.from('quote_catalog_ai_candidates').update({decision,decision_reason:'Manual review in AI Research Centre',reviewed_at:new Date().toISOString()}).in('id',ids);if(error)throw error;ids.forEach(id=>selectedCandidateIds.delete(String(id)));msg(ids.length+' evidence entr'+(ids.length===1?'y':'ies')+' marked '+decision+'.');await load()}
async function apply(){
 rememberSelection();
 // "APPLY ACCEPTED TO LIVE EVIDENCE" should do exactly that. If specific accepted
 // findings are ticked, apply those; otherwise apply every accepted, unapplied finding.
 const selected=checked();
 const ids=selected.length
   ?selected.filter(id=>{const c=candidates.find(x=>String(x.id)===String(id));return c?.decision==='accepted'&&!c.applied_at;})
   :candidates.filter(c=>c.decision==='accepted'&&!c.applied_at).map(c=>String(c.id));
 if(!ids.length)throw Error('There are no accepted findings ready to apply to live evidence.');
 const button=$('apply-selected');
 if(button){button.disabled=true;button.textContent='APPLYING ACCEPTED EVIDENCE…';}
 try{
   let done=0;
   for(const id of ids){
     const {error}=await sb.rpc('apply_accepted_ai_candidate',{p_candidate_id:id});
     if(error)throw error;
     done++;
   }
   ids.forEach(id=>selectedCandidateIds.delete(String(id)));
   msg(done+' accepted evidence entr'+(done===1?'y has':'ies have')+' been applied to live evidence.');
   await load();
 }finally{
   if(button){button.disabled=false;button.textContent='APPLY ACCEPTED TO LIVE EVIDENCE';}
 }
}
async function updateSource(id,status){await api({action:'update_source',source_id:id,discovery_status:status});sourceMsg(status==='approved'?'Source approved and enabled for future research.':'Source blocked from future research.');await loadSources()}
async function start(){try{await initClient();$('run-ai-research')?.addEventListener('click',()=>runResearch().catch(e=>msg(e.message||String(e),true)));$('clear-research-filters')?.addEventListener('click',()=>{['research-manufacturer','research-model','research-category','research-product-type'].forEach(id=>{if($(id))$(id).value=''});setResearchScope('all');});
document.querySelectorAll('.ai-scope-option').forEach(b=>b.addEventListener('click',()=>setResearchScope(b.dataset.scope)));
$('research-evidence-scope')?.addEventListener('change',e=>setResearchScope(e.target.value));
setResearchScope($('research-evidence-scope')?.value||'all');document.addEventListener('change',e=>{const box=e.target.closest?.('.candidate-check');if(!box)return;if(box.checked)selectedCandidateIds.add(String(box.value));else selectedCandidateIds.delete(String(box.value));});$('refresh-ai')?.addEventListener('click',()=>load().then(()=>msg('Review queue refreshed.')).catch(e=>msg(e.message,true)));$('refresh-sources')?.addEventListener('click',()=>loadSources().then(()=>sourceMsg('Research sources refreshed.')).catch(e=>sourceMsg(e.message,true)));$('accept-selected')?.addEventListener('click',()=>decide('accepted').catch(e=>msg(e.message,true)));$('deny-selected')?.addEventListener('click',()=>decide('rejected').catch(e=>msg(e.message,true)));$('apply-selected')?.addEventListener('click',()=>apply().catch(e=>msg(e.message,true)));document.addEventListener('click',e=>{const b=e.target.closest('.ai-edit');if(b){edit(b.dataset.id);return}const save=e.target.closest('.ai-save-edit');if(save){saveEdit(save.dataset.id).catch(x=>msg(x.message,true));return}const cancel=e.target.closest('.ai-cancel-edit');if(cancel){editingId=null;render();return}const pcAccept=e.target.closest('.ai-product-candidate-accept');if(pcAccept){decideProductCandidate(pcAccept.dataset.id,'accepted').catch(x=>msg(x.message,true));return}const pcReject=e.target.closest('.ai-product-candidate-reject');if(pcReject){decideProductCandidate(pcReject.dataset.id,'rejected').catch(x=>msg(x.message,true));return}const pcCreate=e.target.closest('.ai-product-candidate-create');if(pcCreate){createCatalogueDraft(pcCreate.dataset.id).catch(x=>msg(x.message,true));return}const rpc=e.target.closest('[id^="rpc-"]');if(rpc&&['rpc-check-status','rpc-check-ollama','rpc-start-worker','rpc-restart-worker','rpc-stop-worker'].includes(rpc.id)){const cmd={'rpc-check-status':'check_status','rpc-check-ollama':'check_ollama','rpc-start-worker':'start_worker','rpc-restart-worker':'restart_worker','rpc-stop-worker':'stop_worker'}[rpc.id];if(cmd==='stop_worker'&&!confirm('Stop the PowerShell / AI launcher on the Research PC? This closes the launcher itself so it will not automatically restart the worker.'))return;if(cmd==='start_worker'&&!confirm('Start GearCashOut PowerShell / AI now using Start-GearCashOut-AI.ps1?'))return;if(cmd==='restart_worker'&&!confirm('Restart the GearCashOut PowerShell / AI worker now? The current worker will close and Start-GearCashOut-AI.ps1 will launch it again.'))return;requestResearchPcCommand(cmd).then(()=>{
  if(cmd==='stop_worker'){
    const stopButton=$('rpc-stop-worker');
    if(stopButton){stopButton.disabled=true;stopButton.textContent='STOPPING POWERSHELL / AI…';}
    msg('Stop command sent. Closing the PowerShell / AI launcher so its automatic restart loop also stops.');
    setTimeout(()=>loadResearchPcControl().catch(()=>{}),1500);
    setTimeout(()=>loadResearchPcControl().catch(()=>{}),6000);
    return;
  }
  msg(cmd==='start_worker'?'Start command sent. Waiting for the Research PC to come online…':'Restart command sent. Waiting for the Research PC to come back online…');
  setTimeout(()=>loadResearchPcControl().catch(()=>{}),6000);
  setTimeout(()=>loadResearchPcControl().catch(()=>{}),12000);
}).catch(x=>msg(x.message,true));return}const continuousStart=e.target.closest('#start-continuous-research');if(continuousStart){setContinuousResearch(true).catch(x=>msg(x.message,true));return}const continuousStop=e.target.closest('#stop-continuous-research');if(continuousStop){setContinuousResearch(false).catch(x=>msg(x.message,true));return}const s=e.target.closest('.source-action');if(s)updateSource(s.dataset.id,s.dataset.status).catch(x=>sourceMsg(x.message,true))});await Promise.all([load(),loadSources(),loadAgentStatus(),loadContinuousResearch(),loadLiveResearch(),loadRawDiscoveries(),loadResearchPcControl()]);msg('Review queue loaded.');setInterval(()=>{loadAgentStatus().catch(()=>{});loadContinuousResearch().catch(()=>{});loadLiveResearch().catch(()=>{});loadRawDiscoveries().catch(()=>{});loadResearchPcControl().catch(()=>{});load().catch(()=>{})},15000)}catch(e){msg(e.message||String(e),true);sourceMsg(e.message||String(e),true)}}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start()})();