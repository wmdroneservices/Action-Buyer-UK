document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth,message=document.getElementById("staff-message"),list=document.getElementById("staff-list"),summary=document.getElementById("staff-summary");
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}
 const {data:me}=await auth.supabase.from("staff_users").select("can_manage_staff,active").eq("user_id",session.user.id).maybeSingle();
 if(!me?.active||!me?.can_manage_staff){location.href="admin.html";return;}
 const notice=(t,ok=true)=>{message.textContent=t;message.className="form-message "+(ok?"success":"error");};
 const call=async body=>{const {data,error}=await auth.supabase.functions.invoke("manage-staff",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const DAYS=[["monday","Monday"],["tuesday","Tuesday"],["wednesday","Wednesday"],["thursday","Thursday"],["friday","Friday"],["saturday","Saturday"],["sunday","Sunday"]];
 const scheduleHTML=s=>'<div style="display:grid;gap:.55rem">'+DAYS.map(([k,label])=>{const x=(s||{})[k]||{};return '<div data-day="'+k+'" style="display:grid;grid-template-columns:minmax(90px,1fr) minmax(125px,1fr) minmax(125px,1fr) minmax(105px,auto);gap:.65rem;align-items:end;padding:.65rem;border:1px solid #d9dee5;background:#fff"><strong style="padding-bottom:.55rem;color:#102f4f">'+label+'</strong><label>Start<input type="time" data-start value="'+esc(x.start||"")+'"></label><label>End<input type="time" data-end value="'+esc(x.end||"")+'"></label><label class="checkbox-label" style="margin:0;padding-bottom:.55rem"><input type="checkbox" data-off '+(x.off?"checked":"")+'> Day off</label></div>'}).join("")+'</div>';
 const collectSchedule=root=>{const out={};root.querySelectorAll("[data-day]").forEach(row=>{const k=row.dataset.day,off=row.querySelector("[data-off]").checked;out[k]={off,start:off?null:(row.querySelector("[data-start]").value||null),end:off?null:(row.querySelector("[data-end]").value||null)};});return out;};
 const bindSchedule=root=>{root.addEventListener("change",e=>{if(!e.target.matches("[data-off]"))return;const row=e.target.closest("[data-day]"),disabled=e.target.checked;row.querySelector("[data-start]").disabled=disabled;row.querySelector("[data-end]").disabled=disabled;});root.querySelectorAll("[data-off]:checked").forEach(x=>{const row=x.closest("[data-day]");row.querySelector("[data-start]").disabled=true;row.querySelector("[data-end]").disabled=true;});};
 const newSchedule=document.getElementById("new-weekly-schedule");newSchedule.innerHTML=scheduleHTML({});bindSchedule(newSchedule);
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
         <div style="display:flex;gap:.65rem;flex-wrap:wrap"><a class="btn btn-secondary" href="admin-staff-activity.html?staff=${encodeURIComponent(r.user_id)}">VIEW ACTIVITY LOG</a><button class="btn btn-secondary" data-edit="${r.user_id}">EDIT STAFF ACCOUNT</button></div>
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
         <p style="margin-top:1rem"><strong>Weekly working hours</strong></p>\n         <p style="font-size:.82rem;color:#5f6b78;margin-top:-.35rem">Set each day individually and tick Day off where required.</p>\n         <div data-edit-schedule></div>\n         <label class="checkbox-label"><input type="checkbox" data-active ${r.active?"checked":""}>Account active</label>
         <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
           <button class="btn btn-primary" data-save="${r.user_id}">SAVE CHANGES</button>
           <button class="btn btn-secondary" data-reset="${r.user_id}">RESET PASSWORD</button>
           <button class="btn" style="background:#b42318;color:#fff;border-color:#b42318" data-delete="${r.user_id}" data-name="${esc(r.display_name||r.username)}">DELETE STAFF ACCOUNT</button>
         </div>
       </div>
       <div id="activity-${r.user_id}" hidden style="margin-top:1rem;padding-top:1rem;border-top:1px solid #ddd"></div>
     </article>`).join("")||"<p>No staff accounts found.</p>";
     rows.forEach(r=>{const panel=document.getElementById("edit-"+r.user_id),root=panel?.querySelector("[data-edit-schedule]");if(root){root.innerHTML=scheduleHTML(r.work_schedule||{});bindSchedule(root);}});
   }catch(e){notice(e.message||"Could not load staff.",false);}
 }
 document.getElementById("create-staff-form").addEventListener("submit",async e=>{
   e.preventDefault();const permissions={};
   const workSchedule=collectSchedule(newSchedule);
   ["research","purchasing","sales","customers","manage_staff"].forEach(k=>permissions[k]=document.querySelector('[name="'+k+'"]').checked);
   try{
     await call({action:"create",display_name:document.getElementById("new-display-name").value.trim(),username:document.getElementById("new-username").value.trim(),password:document.getElementById("new-password").value,work_schedule:workSchedule,permissions});
     e.target.reset();newSchedule.innerHTML=scheduleHTML({});bindSchedule(newSchedule);notice("Staff account created.");await load();
   }catch(err){notice(err.message||"Could not create staff account.",false);}
 });
 list.addEventListener("click",async e=>{
   const activity=e.target.closest("[data-activity]");
   if(activity){
     const id=activity.dataset.activity,name=activity.dataset.name||"Staff member",panel=document.getElementById("activity-"+id);
     if(!panel)return;
     if(!panel.hidden){panel.hidden=true;activity.textContent="VIEW TODAY'S ACTIVITY";return;}
     activity.disabled=true;activity.textContent="LOADING ACTIVITY...";
     panel.hidden=false;panel.innerHTML="<p>Loading today's activity…</p>";
     try{
       const {data,error}=await auth.supabase.functions.invoke("staff-activity",{body:{action:"list",staff_user_id:id,limit:300}});
       if(error)throw error;if(data?.error)throw new Error(data.error);
       const rows=data?.activity||[],s=data?.summary||{total:0,logins:0,page_views:0,actions:0};
       const time=v=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(v));
       panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline;flex-wrap:wrap"><div><p class="section-kicker">TODAY · STAFF ACTIVITY</p><strong style="font-size:1.05rem;color:#102f4f">'+esc(name)+'</strong></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><span class="status-badge">'+s.logins+' logins</span><span class="status-badge">'+s.page_views+' pages</span><span class="status-badge">'+s.actions+' actions</span></div></div>'+
         (rows.length?'<div style="margin-top:1rem;max-height:520px;overflow:auto;border:1px solid #d8dde3">'+rows.map(r=>'<div style="padding:.75rem 1rem;border-bottom:1px solid #e5e8ec;display:grid;grid-template-columns:90px minmax(120px,1fr) minmax(0,2fr);gap:.75rem"><strong style="color:#102f4f">'+esc(time(r.created_at))+'</strong><span style="font-weight:700">'+esc(r.action_type||r.action_category||"Activity")+'</span><span style="color:#5f6b78">'+esc((r.details?.label||r.details?.title||r.details?.href||r.page||"").toString())+'</span></div>').join("")+'</div>':'<p style="margin-top:1rem">No activity recorded for this staff member today.</p>');
       activity.textContent="HIDE TODAY'S ACTIVITY";
     }catch(err){panel.innerHTML='<p class="form-message error">'+esc(err.message||"Could not load staff activity.")+'</p>';activity.textContent="VIEW TODAY'S ACTIVITY";}
     finally{activity.disabled=false;}
     return;
   }
   const edit=e.target.closest("[data-edit]");
   if(edit){const p=document.getElementById("edit-"+edit.dataset.edit);p.hidden=!p.hidden;return;}
   const save=e.target.closest("[data-save]");
   if(save){
     const panel=document.getElementById("edit-"+save.dataset.save),permissions={};
     panel.querySelectorAll("[data-p]").forEach(x=>permissions[x.dataset.p]=x.checked);
     const originalText=save.textContent;
     save.disabled=true;save.textContent="SAVING...";
     try{
       await call({action:"update",user_id:save.dataset.save,display_name:panel.querySelector("[data-display-name]").value.trim(),username:panel.querySelector("[data-username]").value.trim(),active:panel.querySelector("[data-active]").checked,work_schedule:collectSchedule(panel.querySelector("[data-edit-schedule]")),permissions});
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