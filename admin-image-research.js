(function(){
'use strict';
const auth=()=>window.actionBuyerAuth?.supabase;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=r=>[r.category,r.manufacturer,r.model].filter(Boolean).join(' → ')||'Unclassified target';
const PAGE=100;let rows=[],selected=null,offset=0,total=0,timer=null;

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