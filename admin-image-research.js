(function(){
'use strict';
const auth=()=>window.actionBuyerAuth?.supabase;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=r=>[r.category,r.manufacturer,r.model].filter(Boolean).join(' → ')||'Unclassified target';
const PAGE=100;let rows=[],selected=null,offset=0,total=0,timer=null;
let batchManufacturers=[],batchTargets=[],batchMode=false;
function batchMessage(text='',error=false){const el=$('image-batch-message');if(!el)return;el.textContent=text;el.style.color=error?'#b42318':'#176b36';}
async function loadBatchManufacturers(){
 const db=auth();if(!db)return;
 const {data,error}=await db.rpc('staff_retail_image_research_manufacturers',{p_search:null,p_limit:500});
 if(error){batchMessage(error.message,true);return;}
 batchManufacturers=data||[];
 const select=$('image-batch-manufacturer');
 select.innerHTML='<option value="">Choose manufacturer…</option>'+batchManufacturers.map(m=>'<option value="'+esc(m.manufacturer)+'">'+esc(m.manufacturer)+' · '+Number(m.target_count||0)+' targets</option>').join('');
}
async function loadBatchTargets(){
 const manufacturer=$('image-batch-manufacturer').value,status=$('image-batch-status').value||null;
 if(!manufacturer){batchMessage('Choose a manufacturer first.',true);return;}
 const db=auth();$('image-batch-summary').textContent='Loading '+manufacturer+' targets…';
 const {data,error}=await db.rpc('staff_retail_image_research_manufacturer_targets',{p_manufacturer:manufacturer,p_status:status,p_limit:250});
 if(error){batchMessage(error.message,true);return;}
 batchTargets=data||[];
 renderBatchTargets();
}
function renderBatchTargets(){
 const manufacturer=$('image-batch-manufacturer').value,el=$('image-batch-list');
 if(!batchTargets.length){el.innerHTML='<div class="image-research-empty">No matching targets found for this manufacturer/status.</div>';$('image-batch-actions').hidden=true;return;}
 $('image-batch-summary').textContent=manufacturer+' · '+batchTargets.length+' exact queue target(s) loaded. Each deployment is locked to its Category + Manufacturer record.';
 el.innerHTML=batchTargets.map((r,i)=>{
   const locked=!!r.approved||r.research_status==='approved';
   return '<article class="image-batch-card '+(locked?'locked':'')+'" data-batch-id="'+esc(r.id)+'">'
    +'<div class="image-batch-card-head"><div><p class="section-kicker">'+esc(String(r.entity_scope||'target').toUpperCase())+'</p><h3>'+esc(r.category||'Uncategorised')+'</h3><p class="image-research-summary">'+esc(manufacturer)+(r.model?' · '+esc(r.model):'')+' · '+esc(r.research_status||'pending')+(locked?' · APPROVED LOCKED':'')+'</p></div></div>'
    +(locked?'<p class="image-research-message">Approved imagery is protected and cannot be overwritten by this batch workflow.</p>':
      '<div class="image-batch-grid">'
      +'<label class="image-batch-wide">Direct image URL<input data-field="image_url" type="url" value="'+esc(r.image_url||'')+'" placeholder="https://…"></label>'
      +'<label class="image-batch-wide">Source page URL<input data-field="source_url" type="url" value="'+esc(r.source_url||'')+'" placeholder="https://…"></label>'
      +'<label>Source name<input data-field="source_name" value="'+esc(r.source_name||'')+'" placeholder="Official manufacturer / source"></label>'
      +'<label>Licence / rights status<input data-field="licence_status" value="'+esc(r.licence_status||'unverified')+'"></label>'
      +'<label class="image-batch-wide">Notes<textarea data-field="notes" rows="3" placeholder="Why this image matches '+esc(manufacturer)+' + '+esc(r.category||'target')+'; rights/review notes.">'+esc(r.notes||'')+'</textarea></label>'
      +'</div>')
    +'</article>';
 }).join('');
 $('image-batch-actions').hidden=false;
 $('image-batch-brief-output').hidden=true;
 batchMessage('');
}
function buildGemmaBrief(){
 const manufacturer=$('image-batch-manufacturer').value;
 const targets=batchTargets.filter(r=>!r.approved&&r.research_status!=='approved').map((r,i)=>({
   n:i+1,category:r.category||'',scope:r.entity_scope||'',model:r.model||''
 }));
 return 'GEARCASHOUT — GEMMA MANUFACTURER IMAGE RESEARCH\n\n'
 +'MANUFACTURER: '+manufacturer+'\n'
 +'RESEARCH KEY: Category + Manufacturer\n\n'
 +'RULES:\n'
 +'1. Research each target separately using manufacturer + exact category.\n'
 +'2. Do not use one generic manufacturer image across unrelated categories.\n'
 +'3. Prefer official manufacturer/source pages.\n'
 +'4. Return direct permitted image assets only when available; otherwise return the source page as a candidate for review.\n'
 +'5. Never approve or publish automatically. Candidate status only.\n'
 +'6. Do not assign an image to another manufacturer or category.\n'
 +'7. Do not overwrite an approved image.\n\n'
 +'TARGETS:\n'+targets.map(t=>'TARGET '+t.n+'\nManufacturer: '+manufacturer+'\nCategory: '+t.category+(t.model?'\nModel: '+t.model:'')+'\nSearch: '+manufacturer+' official '+t.category+' imagery\n').join('\n')
 +'\nRETURN FORMAT FOR EACH TARGET:\n'
 +'Category:\nDirect image URL (if permitted):\nSource page URL:\nSource name:\nLicence/rights status:\nNotes explaining exact Category + Manufacturer match:\n';
}
function showGemmaBrief(){
 const out=$('image-batch-brief-output');out.value=buildGemmaBrief();out.hidden=false;out.focus();out.select();batchMessage('Gemma manufacturer batch brief generated.');
}
async function copyGemmaBrief(){
 const out=$('image-batch-brief-output');if(out.hidden||!out.value)showGemmaBrief();
 try{await navigator.clipboard.writeText(out.value);batchMessage('Gemma batch brief copied.');}
 catch{out.focus();out.select();batchMessage('Brief selected. Copy it manually with Ctrl+C.');}
}
async function saveBatch(){
 const manufacturer=$('image-batch-manufacturer').value;
 const assignments=[];
 document.querySelectorAll('[data-batch-id]').forEach(card=>{
   const target=batchTargets.find(r=>String(r.id)===String(card.dataset.batchId));if(!target||target.approved||target.research_status==='approved')return;
   const get=name=>String(card.querySelector('[data-field="'+name+'"]')?.value||'').trim();
   const image_url=get('image_url'),source_url=get('source_url'),source_name=get('source_name'),licence_status=get('licence_status'),notes=get('notes');
   if(image_url||source_url||source_name||notes)assignments.push({queue_id:target.id,category:target.category||null,image_url,source_url,source_name,licence_status,notes});
 });
 if(!assignments.length){batchMessage('Add at least one image/source candidate before deployment.',true);return;}
 const btn=$('image-batch-save'),old=btn.textContent;btn.disabled=true;btn.textContent='DEPLOYING…';
 try{
   const {data,error}=await auth().rpc('staff_retail_image_research_batch_save',{p_manufacturer:manufacturer,p_assignments:assignments});
   if(error)throw error;
   batchMessage((data||[]).length+' candidate image record(s) deployed to exact '+manufacturer+' Category + Manufacturer targets.');
   await loadBatchTargets();await load(true);
 }catch(e){batchMessage(e.message||String(e),true);}
 finally{btn.disabled=false;btn.textContent=old;}
}
function setResearchMode(batch){
 batchMode=batch;$('image-batch-panel').hidden=!batch;
 $('.image-research-grid');
 $('image-research-summary').hidden=batch;
 document.querySelector('.image-research-grid').hidden=batch;
 $('image-mode-individual').classList.toggle('active',!batch);
 $('image-mode-batch').classList.toggle('active',batch);
 if(batch&&batchManufacturers.length===0)loadBatchManufacturers();
}


function message(text='',error=false){const el=$('image-research-message');el.textContent=text;el.style.color=error?'#b42318':'#176b36';}
function editorEmpty(){ $('image-research-editor').innerHTML='<div class="image-research-empty">Select an image research target from the queue.</div>'; }
async function ensureAccess(){
 const db=auth();if(!db){message('Authentication is still loading. Refresh if this message remains.',true);return false;}
 const {data:{session}}=await db.auth.getSession();if(!session?.user?.id){location.href='staff-login.html';return false;}
 const {data:staff,error}=await db.from('staff_users').select('active,can_access_research,can_manage_staff').eq('user_id',session.user.id).maybeSingle();
 if(error||!staff?.active||(!staff.can_access_research&&!staff.can_manage_staff)){message('You do not have Research & Pricing staff access.',true);return false;}
 return true;
}
function rpcParams(){return {p_scope:$('image-filter-scope').value||null,p_status:$('image-filter-status').value||null,p_category:null,p_search:$('image-filter-search').value.trim()||null,p_limit:PAGE,p_offset:offset};}
async function load(reset=true){
 const db=auth();if(!db)return;
 if(reset){rows=[];selected=null;offset=0;total=0;editorEmpty();}
 $('image-research-summary').textContent='Loading image research queue…';
 const {data,error}=await db.rpc('staff_retail_image_research_list',rpcParams());
 if(error){message(error.message,true);$('image-research-summary').textContent='Queue could not be loaded.';return;}
 const page=data||[];total=Number(page[0]?.total_count||0);rows.push(...page);offset+=page.length;
 renderList();$('image-research-summary').textContent=total?rows.length.toLocaleString()+' of '+total.toLocaleString()+' research targets loaded':'No matching research targets.';
 $('image-load-more').hidden=rows.length>=total;
}
function renderList(){
 const el=$('image-research-list');
 el.innerHTML=rows.map(r=>'<button type="button" class="image-research-row '+(selected?.id===r.id?'selected':'')+'" data-id="'+esc(r.id)+'"><span class="image-scope-pill">'+esc(r.entity_scope)+'</span><strong>'+esc(label(r))+'</strong><small>'+esc(r.research_status)+(r.approved?' · approved':'')+'</small></button>').join('');
 el.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>{selected=rows.find(r=>String(r.id)===b.dataset.id)||null;renderList();renderEditor();}));
}
function renderEditor(){
 const el=$('image-research-editor');if(!selected){editorEmpty();return;}
 const r=selected,opts=['pending','candidate','approved','rejected','blocked'].map(s=>'<option value="'+s+'" '+(r.research_status===s?'selected':'')+'>'+s+'</option>').join('');
 el.innerHTML='<div><p class="section-kicker">'+esc(String(r.entity_scope||'').toUpperCase())+'</p><h2>'+esc(label(r))+'</h2><p class="image-research-summary">Last updated '+(r.updated_at?new Date(r.updated_at).toLocaleString('en-GB'):'—')+'</p></div>'+
 '<div class="image-research-preview">'+(r.image_url?'<img src="'+esc(r.image_url)+'" alt="'+esc(label(r))+'">':'<span>No candidate image recorded yet.</span>')+'</div>'+
 '<form id="image-research-form" class="image-research-form">'+
 '<label>Image URL<input name="image_url" type="url" value="'+esc(r.image_url||'')+'"></label>'+
 '<label>Source page URL<input name="source_url" type="url" value="'+esc(r.source_url||'')+'"></label>'+
 '<label>Source name<input name="source_name" value="'+esc(r.source_name||'')+'"></label>'+
 '<label>Licence / rights status<input name="licence_status" value="'+esc(r.licence_status||'unverified')+'"></label>'+
 '<label>Research status<select name="research_status">'+opts+'</select></label>'+
 '<label class="image-checkbox"><input name="approved" type="checkbox" '+(r.approved?'checked':'')+'> <span>Approved for sales-channel use</span></label>'+
 '<label>Research notes<textarea name="notes" rows="7">'+esc(r.notes||'')+'</textarea></label>'+
 '<div class="image-research-actions"><button class="btn btn-primary" type="submit">SAVE RESEARCH RECORD</button><button id="image-preview-button" class="btn btn-secondary" type="button">PREVIEW IMAGE</button></div>'+
 '<p id="image-save-message" class="image-research-message"></p></form>';
 const form=$('image-research-form');
 form.addEventListener('submit',save);
 $('image-preview-button').addEventListener('click',()=>{
  const imageUrl=String(form.elements['image_url']?.value||'').trim();
  const sourceUrl=String(form.elements['source_url']?.value||'').trim();
  const preview=el.querySelector('.image-research-preview');
  if(imageUrl){
    preview.innerHTML='<img src="'+esc(imageUrl)+'" alt="Candidate image preview">';
  }else if(sourceUrl){
    preview.innerHTML='<div class="image-research-preview-empty"><span>No direct image URL has been recorded yet.</span><a class="btn btn-secondary" href="'+esc(sourceUrl)+'" target="_blank" rel="noopener">OPEN SOURCE PAGE</a></div>';
  }else{
    preview.innerHTML='<span>No image URL or source page URL entered.</span>';
  }
});
}
async function save(e){
 e.preventDefault();const f=e.currentTarget,db=auth(),status=f.research_status.value,approved=f.approved.checked,saveMsg=$('image-save-message');
 if(approved&&(!f.image_url.value.trim()||status!=='approved')){saveMsg.textContent='Approval requires an image URL and Approved research status.';return;}
 saveMsg.textContent='Saving…';
 const {data,error}=await db.rpc('staff_retail_image_research_save',{
   p_id:selected.id,p_image_url:f.image_url.value.trim(),p_source_url:f.source_url.value.trim(),
   p_source_name:f.source_name.value.trim(),p_licence_status:f.licence_status.value.trim(),
   p_research_status:status,p_approved:approved,p_notes:f.notes.value.trim()
 });
 if(error){saveMsg.textContent=error.message;return;}
 selected={...selected,...data};rows=rows.map(x=>x.id===selected.id?selected:x);saveMsg.textContent='Saved.';renderList();
}
async function start(){
 if(!(await ensureAccess()))return;
 await load(true);
 $('image-filter-scope').addEventListener('change',()=>load(true));
 $('image-filter-status').addEventListener('change',()=>load(true));
 $('image-filter-search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load(true),350);});
 $('image-refresh').addEventListener('click',()=>load(true));
 $('image-load-more').addEventListener('click',()=>load(false));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();