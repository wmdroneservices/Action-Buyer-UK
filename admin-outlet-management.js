document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession(); if(!session){location.href="staff-login.html";return;}
 const {data:staff,error}=await auth.supabase.from("staff_users").select("active,can_manage_staff").eq("user_id",session.user.id).maybeSingle();
 if(error||!staff?.active||!staff?.can_manage_staff){location.href="admin.html";return;}
 const list=document.getElementById("outlet-list"),msg=document.getElementById("outlet-message"),form=document.getElementById("outlet-form");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const setMsg=(text,error=false)=>{msg.textContent=text;msg.className="form-message"+(error?" error":"");};
 async function load(){
   list.textContent="Loading outlets…";
   const {data,error}=await auth.supabase.from("sales_outlets").select("id,outlet_code,outlet_name,outlet_type,active,public_base_url,notes,created_at").order("outlet_name");
   if(error){list.textContent="Could not load outlets: "+error.message;return;}
   list.innerHTML=(data||[]).map(o=>`<article class="dashboard-link-card" style="margin:.75rem 0;min-height:auto;padding:1rem" data-id="${esc(o.id)}">
     <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><strong>${esc(o.outlet_name)}</strong><div style="font-size:.85rem;color:#667085;margin-top:.3rem">${esc(o.outlet_code)} · ${esc(o.outlet_type)} · ${o.active?"ACTIVE":"INACTIVE"}</div>${o.public_base_url?'<div style="margin-top:.4rem"><a href="'+esc(o.public_base_url)+'" target="_blank" rel="noopener noreferrer">'+esc(o.public_base_url)+'</a></div>':""}${o.notes?'<div style="margin-top:.4rem;color:#667085">'+esc(o.notes)+'</div>':""}</div>
     <button class="btn ${o.active?"btn-secondary":"btn-primary"} toggle-outlet" data-id="${esc(o.id)}" data-active="${o.active}">${o.active?"DEACTIVATE":"ACTIVATE"}</button></div></article>`).join("")||"<p>No outlets configured.</p>";
 }
 form.addEventListener("submit",async e=>{
   e.preventDefault(); setMsg("Saving outlet…");
   const code=document.getElementById("outlet-code").value.trim().toUpperCase().replace(/-/g,"_");
   if(!/^[A-Z0-9_]+$/.test(code)){setMsg("Outlet code contains unsupported characters.",true);return;}
   const payload={outlet_name:document.getElementById("outlet-name").value.trim(),outlet_code:code,outlet_type:document.getElementById("outlet-type").value,public_base_url:document.getElementById("outlet-url").value.trim()||null,notes:document.getElementById("outlet-notes").value.trim()||null,active:document.getElementById("outlet-active").checked};
   const {error}=await auth.supabase.from("sales_outlets").insert(payload);
   if(error){setMsg(error.message,true);return;} form.reset();document.getElementById("outlet-active").checked=true;setMsg("Outlet added.");await load();
 });
 list.addEventListener("click",async e=>{
   const btn=e.target.closest(".toggle-outlet");if(!btn)return;
   const next=btn.dataset.active!=="true"; btn.disabled=true;setMsg((next?"Activating":"Deactivating")+" outlet…");
   const {error}=await auth.supabase.from("sales_outlets").update({active:next,updated_at:new Date().toISOString()}).eq("id",btn.dataset.id);
   if(error){setMsg(error.message,true);btn.disabled=false;return;}setMsg(next?"Outlet activated.":"Outlet deactivated. Historical listings remain intact.");await load();
 });
 await load();
});