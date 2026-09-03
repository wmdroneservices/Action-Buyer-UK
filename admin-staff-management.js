document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth,message=document.getElementById("staff-message"),list=document.getElementById("staff-list"),summary=document.getElementById("staff-summary");
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}
 const {data:me}=await auth.supabase.from("staff_users").select("can_manage_staff,active").eq("user_id",session.user.id).maybeSingle();
 if(!me?.active||!me?.can_manage_staff){location.href="admin.html";return;}
 const notice=(t,ok=true)=>{message.textContent=t;message.className="form-message "+(ok?"success":"error");};
 const call=async body=>{const {data,error}=await auth.supabase.functions.invoke("manage-staff",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const renderSummary=rows=>{
   const active=rows.filter(r=>r.active).length,inactive=rows.length-active;
   summary.innerHTML=
     '<div style="min-width:190px;padding:1rem 1.15rem;border:1px solid #2f7d5a;background:#edf8f1;color:#1f6b49"><strong style="display:block;font-size:1.55rem;line-height:1">'+active+'</strong><span style="font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em">Active staff</span></div>'+
     '<div style="min-width:190px;padding:1rem 1.15rem;border:1px solid #b42318;background:#fff1f0;color:#b42318"><strong style="display:block;font-size:1.55rem;line-height:1">'+inactive+'</strong><span style="font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em">Inactive staff</span></div>';
 };
 async function load(){
   try{
     const data=await call({action:"list"}),rows=data.staff||[];
     renderSummary(rows);
     list.innerHTML=rows.map(r=>`<article class="valuation-card" style="display:block">
       <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">
         <div><strong style="font-size:1.15rem;color:#102f4f">${esc(r.display_name||r.username)}</strong><p>User ID: ${esc(r.username||"Not set")} · ${r.active?"ACTIVE":"DISABLED"}</p></div>
         <button class="btn btn-secondary" data-edit="${r.user_id}">EDIT STAFF ACCOUNT</button>
       </div>
       <div id="edit-${r.user_id}" hidden style="margin-top:1rem;padding-top:1rem;border-top:1px solid #ddd">
         <label>Display name<input type="text" data-display-name value="${esc(r.display_name||"")}" required></label>
         <label>User ID<input type="text" data-username value="${esc(r.username||"")}" minlength="3" maxlength="40" autocomplete="off" required></label>
         <p style="margin-top:1rem"><strong>Dashboard access</strong></p>
         <label class="checkbox-label"><input type="checkbox" data-p="research" ${r.can_access_research?"checked":""}>Research &amp; Pricing</label>
         <label class="checkbox-label"><input type="checkbox" data-p="purchasing" ${r.can_access_purchasing?"checked":""}>Purchasing</label>
         <label class="checkbox-label"><input type="checkbox" data-p="sales" ${r.can_access_sales?"checked":""}>Sales</label>
         <label class="checkbox-label"><input type="checkbox" data-p="customers" ${r.can_access_customers?"checked":""}>Customers</label>
         <label class="checkbox-label"><input type="checkbox" data-p="manage_staff" ${r.can_manage_staff?"checked":""}>Staff Management</label>
         <p style="margin-top:1rem"><strong>Permitted login hours (optional)</strong></p>\n         <p style="font-size:.82rem;color:#5f6b78;margin-top:-.35rem">Leave both blank for unrestricted access. UK local time is used.</p>\n         <div style="display:flex;gap:1rem;flex-wrap:wrap">\n           <label style="flex:1;min-width:180px">Start time<input type="time" data-work-start value="${esc(r.work_start_time||"")}"></label>\n           <label style="flex:1;min-width:180px">End time<input type="time" data-work-end value="${esc(r.work_end_time||"")}"></label>\n         </div>\n         <label class="checkbox-label"><input type="checkbox" data-active ${r.active?"checked":""}>Account active</label>
         <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
           <button class="btn btn-primary" data-save="${r.user_id}">SAVE CHANGES</button>
           <button class="btn btn-secondary" data-reset="${r.user_id}">RESET PASSWORD</button>
           <button class="btn" style="background:#b42318;color:#fff;border-color:#b42318" data-delete="${r.user_id}" data-name="${esc(r.display_name||r.username)}">DELETE STAFF ACCOUNT</button>
         </div>
       </div>
     </article>`).join("")||"<p>No staff accounts found.</p>";
   }catch(e){notice(e.message||"Could not load staff.",false);}
 }
 document.getElementById("create-staff-form").addEventListener("submit",async e=>{
   e.preventDefault();const permissions={};
   const workStart=document.getElementById("new-work-start").value||null;
   const workEnd=document.getElementById("new-work-end").value||null;
   ["research","purchasing","sales","customers","manage_staff"].forEach(k=>permissions[k]=document.querySelector('[name="'+k+'"]').checked);
   try{
     await call({action:"create",display_name:document.getElementById("new-display-name").value.trim(),username:document.getElementById("new-username").value.trim(),password:document.getElementById("new-password").value,work_start_time:workStart,work_end_time:workEnd,permissions});
     e.target.reset();notice("Staff account created.");await load();
   }catch(err){notice(err.message||"Could not create staff account.",false);}
 });
 list.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit]");
   if(edit){const p=document.getElementById("edit-"+edit.dataset.edit);p.hidden=!p.hidden;return;}
   const save=e.target.closest("[data-save]");
   if(save){
     const panel=document.getElementById("edit-"+save.dataset.save),permissions={};
     panel.querySelectorAll("[data-p]").forEach(x=>permissions[x.dataset.p]=x.checked);
     const originalText=save.textContent;
     save.disabled=true;save.textContent="SAVING...";
     try{
       await call({action:"update",user_id:save.dataset.save,display_name:panel.querySelector("[data-display-name]").value.trim(),username:panel.querySelector("[data-username]").value.trim(),active:panel.querySelector("[data-active]").checked,work_start_time:panel.querySelector("[data-work-start]").value||null,work_end_time:panel.querySelector("[data-work-end]").value||null,permissions});
       save.textContent="SAVED";
       notice("Staff account updated successfully.");
       await load();
       const reopened=document.getElementById("edit-"+save.dataset.save);
       if(reopened)reopened.hidden=false;
     }catch(err){
       notice(err.message||"Could not save staff account.",false);
       save.disabled=false;save.textContent=originalText;
     }
     return;
   }
   const reset=e.target.closest("[data-reset]");
   if(reset){
     const password=prompt("Enter the new password (minimum 8 characters):");
     if(!password)return;
     try{await call({action:"reset_password",user_id:reset.dataset.reset,password});notice("Password updated.");}catch(err){notice(err.message,false);}
     return;
   }
   const del=e.target.closest("[data-delete]");
   if(del){
     const name=del.dataset.name||"this staff account";
     if(!confirm('Delete "'+name+'"? This permanently removes the staff login and cannot be undone.'))return;
     try{await call({action:"delete",user_id:del.dataset.delete});notice("Staff account deleted.");await load();}catch(err){notice(err.message,false);}
   }
 });
 await load();
});