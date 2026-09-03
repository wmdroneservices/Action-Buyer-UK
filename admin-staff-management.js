document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth,message=document.getElementById("staff-message"),list=document.getElementById("staff-list");
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}
 const {data:me}=await auth.supabase.from("staff_users").select("can_manage_staff,active").eq("user_id",session.user.id).maybeSingle();
 if(!me?.active||!me?.can_manage_staff){location.href="admin.html";return;}
 const notice=(t,ok=true)=>{message.textContent=t;message.className="form-message "+(ok?"success":"error");};
 const call=async body=>{const {data,error}=await auth.supabase.functions.invoke("manage-staff",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const perms=row=>({research:row.can_access_research,purchasing:row.can_access_purchasing,sales:row.can_access_sales,customers:row.can_access_customers,manage_staff:row.can_manage_staff});
 async function load(){
   try{const data=await call({action:"list"});const rows=data.staff||[];
   list.innerHTML=rows.map(r=>`<article class="valuation-card" style="display:block"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><strong style="font-size:1.15rem;color:#102f4f">${esc(r.display_name||r.username)}</strong><p>User ID: ${esc(r.username||"Not set")} · ${r.active?"ACTIVE":"DISABLED"}</p></div><button class="btn btn-secondary" data-edit="${r.user_id}">EDIT ACCESS</button></div><div id="edit-${r.user_id}" hidden style="margin-top:1rem;padding-top:1rem;border-top:1px solid #ddd">
   <label class="checkbox-label"><input type="checkbox" data-p="research" ${r.can_access_research?"checked":""}>Research &amp; Pricing</label>
   <label class="checkbox-label"><input type="checkbox" data-p="purchasing" ${r.can_access_purchasing?"checked":""}>Purchasing</label>
   <label class="checkbox-label"><input type="checkbox" data-p="sales" ${r.can_access_sales?"checked":""}>Sales</label>
   <label class="checkbox-label"><input type="checkbox" data-p="customers" ${r.can_access_customers?"checked":""}>Customers</label>
   <label class="checkbox-label"><input type="checkbox" data-p="manage_staff" ${r.can_manage_staff?"checked":""}>Staff Management</label>
   <label class="checkbox-label"><input type="checkbox" data-active ${r.active?"checked":""}>Account active</label>
   <div style="display:flex;gap:.75rem;flex-wrap:wrap"><button class="btn btn-primary" data-save="${r.user_id}">SAVE ACCESS</button><button class="btn btn-secondary" data-reset="${r.user_id}">RESET PASSWORD</button></div>
   </div></article>`).join("")||"<p>No staff accounts found.</p>";
   }catch(e){notice(e.message||"Could not load staff.",false);}
 }
 document.getElementById("create-staff-form").addEventListener("submit",async e=>{
   e.preventDefault();const permissions={};
   ["research","purchasing","sales","customers","manage_staff"].forEach(k=>permissions[k]=document.querySelector('[name="'+k+'"]').checked);
   try{await call({action:"create",display_name:document.getElementById("new-display-name").value.trim(),username:document.getElementById("new-username").value.trim(),password:document.getElementById("new-password").value,permissions});e.target.reset();notice("Staff account created.");await load();}catch(err){notice(err.message||"Could not create staff account.",false);}
 });
 list.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit]");if(edit){const p=document.getElementById("edit-"+edit.dataset.edit);p.hidden=!p.hidden;return;}
   const save=e.target.closest("[data-save]");if(save){const panel=document.getElementById("edit-"+save.dataset.save),permissions={};panel.querySelectorAll("[data-p]").forEach(x=>permissions[x.dataset.p]=x.checked);try{await call({action:"update",user_id:save.dataset.save,active:panel.querySelector("[data-active]").checked,permissions});notice("Staff access updated.");await load();}catch(err){notice(err.message,false);}return;}
   const reset=e.target.closest("[data-reset]");if(reset){const password=prompt("Enter the new password (minimum 8 characters):");if(!password)return;try{await call({action:"reset_password",user_id:reset.dataset.reset,password});notice("Password updated.");}catch(err){notice(err.message,false);}}
 });
 await load();
});