document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession(); if(!session){location.href="staff-login.html";return;}
 const {data:staff,error}=await auth.supabase.from("staff_users").select("active,can_manage_staff").eq("user_id",session.user.id).maybeSingle();
 if(error||!staff?.active||!staff?.can_manage_staff){location.href="admin.html";return;}
 const list=document.getElementById("outlet-list"),msg=document.getElementById("outlet-message"),form=document.getElementById("outlet-form");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const setMsg=(text,error=false)=>{msg.textContent=text;msg.className="form-message"+(error?" error":"");};
 const typeOptions=(selected)=>['owned_storefront','marketplace','auction','other'].map(v=>`<option value="${v}" ${selected===v?'selected':''}>${v==='owned_storefront'?'Owned website':v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('');
 async function load(){
   list.textContent="Loading outlets…";
   const {data,error}=await auth.supabase.from("sales_outlets").select("id,outlet_code,outlet_name,outlet_type,active,public_base_url,notes,created_at").order("outlet_name");
   if(error){list.textContent="Could not load outlets: "+error.message;return;}
   list.innerHTML=(data||[]).map(o=>`<article class="dashboard-link-card" style="margin:.75rem 0;min-height:auto;padding:1rem" data-id="${esc(o.id)}">
     <form class="outlet-edit-form" data-id="${esc(o.id)}">
       <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(140px,.6fr) minmax(170px,.7fr);gap:.75rem">
         <label>Outlet name<input name="outlet_name" value="${esc(o.outlet_name)}" maxlength="120" required></label>
         <label>Outlet code<input name="outlet_code" value="${esc(o.outlet_code)}" maxlength="60" pattern="[A-Za-z0-9_-]+" required></label>
         <label>Outlet type<select name="outlet_type" required>${typeOptions(o.outlet_type)}</select></label>
       </div>
       <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:.75rem;margin-top:.75rem">
         <label>Public base URL<input name="public_base_url" type="url" maxlength="500" value="${esc(o.public_base_url||'')}" placeholder="https://example.co.uk"></label>
         <label>Internal notes<input name="notes" maxlength="2000" value="${esc(o.notes||'')}"></label>
       </div>
       <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:.85rem">
         <label class="checkbox-label" style="margin:0"><input name="active" type="checkbox" ${o.active?'checked':''}> Active</label>
         <button class="btn btn-primary" type="submit">SAVE OUTLET</button>
         ${o.public_base_url?`<a class="btn btn-secondary" href="${esc(o.public_base_url)}" target="_blank" rel="noopener noreferrer">OPEN OUTLET</a>`:''}
         <span class="form-message outlet-edit-message" aria-live="polite"></span>
       </div>
     </form>
   </article>`).join("")||"<p>No outlets configured.</p>";
 }
 form.addEventListener("submit",async e=>{
   e.preventDefault(); setMsg("Saving outlet…");
   const code=document.getElementById("outlet-code").value.trim().toUpperCase().replace(/-/g,"_");
   if(!/^[A-Z0-9_]+$/.test(code)){setMsg("Outlet code contains unsupported characters.",true);return;}
   const payload={outlet_name:document.getElementById("outlet-name").value.trim(),outlet_code:code,outlet_type:document.getElementById("outlet-type").value,public_base_url:document.getElementById("outlet-url").value.trim()||null,notes:document.getElementById("outlet-notes").value.trim()||null,active:document.getElementById("outlet-active").checked};
   const {error}=await auth.supabase.from("sales_outlets").insert(payload);
   if(error){setMsg(error.message,true);return;} form.reset();document.getElementById("outlet-active").checked=true;setMsg("Outlet added.");await load();
 });
 list.addEventListener("submit",async e=>{
   const edit=e.target.closest(".outlet-edit-form"); if(!edit)return;
   e.preventDefault();
   const fd=new FormData(edit),message=edit.querySelector(".outlet-edit-message"),button=edit.querySelector("button[type=submit]");
   button.disabled=true;message.textContent="Saving…";message.className="form-message";
   const {error}=await auth.supabase.rpc("staff_update_sales_outlet",{
     p_outlet_id:edit.dataset.id,
     p_outlet_name:String(fd.get("outlet_name")||"").trim(),
     p_outlet_code:String(fd.get("outlet_code")||"").trim().toUpperCase(),
     p_outlet_type:String(fd.get("outlet_type")||""),
     p_active:fd.get("active")==="on",
     p_public_base_url:String(fd.get("public_base_url")||"").trim()||null,
     p_notes:String(fd.get("notes")||"").trim()||null
   });
   if(error){message.textContent=error.message;message.className="form-message error";button.disabled=false;return;}
   message.textContent="Outlet saved.";message.className="form-message success";button.disabled=false;await load();
 });
 await load();
});