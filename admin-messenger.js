document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth,notice=document.getElementById("messenger-notice");
 const directEl=document.getElementById("direct-targets"),groupEl=document.getElementById("group-targets"),messageList=document.getElementById("message-list"),form=document.getElementById("message-form"),body=document.getElementById("message-body"),title=document.getElementById("conversation-title");
 const say=(text,ok=false)=>{notice.textContent=text;notice.className="form-message "+(ok?"success":"error");};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const session=await auth.getSession();if(!session){location.href="staff-login.html";return;}
 const {data:me}=await auth.supabase.from("staff_users").select("active,can_manage_staff,display_name,business_email").eq("user_id",session.user.id).maybeSingle();
 if(!me?.active){location.href="staff-login.html";return;}
 let staff=[],groups=[],current=null,refreshTimer=null,messageChannel=null;
 const rpc=async(name,args={})=>{const {data,error}=await auth.supabase.rpc(name,args);if(error)throw error;return data;};
 async function loadDirectory(){
   staff=await rpc("staff_message_recipients")||[];
   groups=await rpc("staff_message_groups_for_me")||[];
   directEl.innerHTML=staff.length?staff.map(s=>'<button class="messenger-target" data-direct="'+s.user_id+'">'+esc(s.display_name||s.business_email)+'</button>').join(""):"<p>No staff members are currently available to message.</p>";
   groupEl.innerHTML=groups.length?groups.map(g=>'<button class="messenger-target" data-group="'+g.id+'">'+esc(g.name)+'</button>').join(""):"<p>No group chats assigned.</p>";
   if(me.can_manage_staff)renderManagement();
 }
 function renderManagement(){
   const panel=document.getElementById("messenger-management");panel.hidden=false;
   const sel=document.getElementById("permission-staff");
   sel.innerHTML=staff.map(s=>'<option value="'+s.user_id+'">'+esc(s.display_name||s.business_email)+'</option>').join("");
   const members=staff.map(s=>'<label class="checkbox-label"><input type="checkbox" value="'+s.user_id+'"> '+esc(s.display_name||s.business_email)+'</label>').join("");
   document.getElementById("group-members").innerHTML=members;
   loadPermissionChoices();
 }
 async function loadPermissionChoices(){
   if(!me.can_manage_staff)return;
   const id=document.getElementById("permission-staff").value;if(!id)return;
   try{
     const allowed=await rpc("staff_get_message_recipients_for",{p_staff_id:id})||[];
     const set=new Set(allowed.map(x=>x.user_id));
     document.getElementById("permission-recipients").innerHTML=staff.filter(s=>s.user_id!==id).map(s=>'<label class="checkbox-label"><input type="checkbox" value="'+s.user_id+'" '+(set.has(s.user_id)?"checked":"")+'> '+esc(s.display_name||s.business_email)+'</label>').join("")||"<p>No other staff accounts.</p>";
   }catch(e){say(e.message||"Could not load messaging permissions.");}
 }
 async function loadConversation(){
   if(!current)return;
   document.querySelectorAll(".messenger-target").forEach(x=>x.classList.toggle("active",(current.type==="direct"&&x.dataset.direct===current.id)||(current.type==="group"&&x.dataset.group===current.id)));
   let query=auth.supabase.from("staff_messages").select("id,sender_id,recipient_id,group_id,body,created_at").order("created_at",{ascending:true}).limit(300);
   if(current.type==="direct"){
     const id=current.id;
     const {data,error}=await query.or("and(sender_id.eq."+session.user.id+",recipient_id.eq."+id+"),and(sender_id.eq."+id+",recipient_id.eq."+session.user.id+")");
     if(error)throw error;renderMessages(data||[]);
   }else{
     const {data,error}=await query.eq("group_id",current.id);if(error)throw error;renderMessages(data||[]);
   }
 }
 function renderMessages(rows){
   const names=new Map(staff.map(s=>[s.user_id,s.display_name||s.business_email]));
   names.set(session.user.id,me.display_name||me.business_email||"You");
   messageList.innerHTML=rows.length?rows.map(m=>{
     const mine=m.sender_id===session.user.id;
     const when=new Intl.DateTimeFormat("en-GB",{dateStyle:"short",timeStyle:"short"}).format(new Date(m.created_at));
     return '<div class="message-row '+(mine?"mine":"")+'"><div class="message-meta">'+esc(mine?"You":names.get(m.sender_id)||"Staff member")+" · "+esc(when)+'</div><div>'+esc(m.body)+'</div></div>';
   }).join(""):"<p>No messages yet. Start the conversation.</p>";
   messageList.scrollTop=messageList.scrollHeight;
 }
 async function openConversation(type,id,label){
   current={type,id,label};title.textContent=label;form.hidden=false;
   await loadConversation();
   if(refreshTimer)clearInterval(refreshTimer);
   if(messageChannel){auth.supabase.removeChannel(messageChannel);messageChannel=null;}
   messageChannel=auth.supabase.channel("staff-messenger-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"staff_messages"},()=>loadConversation().catch(()=>{})).subscribe();
   refreshTimer=setInterval(()=>loadConversation().catch(()=>{}),15000);
 }
 document.addEventListener("click",e=>{
   const d=e.target.closest("[data-direct]");if(d){const s=staff.find(x=>x.user_id===d.dataset.direct);openConversation("direct",d.dataset.direct,s?.display_name||s?.business_email||"Staff member").catch(err=>say(err.message));}
   const g=e.target.closest("[data-group]");if(g){const x=groups.find(v=>v.id===g.dataset.group);openConversation("group",g.dataset.group,x?.name||"Group chat").catch(err=>say(err.message));}
 });
 form.addEventListener("submit",async e=>{
   e.preventDefault();if(!current)return;
   const text=body.value.trim();if(!text)return;
   const button=form.querySelector("button");button.disabled=true;
   try{
     if(current.type==="direct")await rpc("staff_send_direct_message",{p_recipient_id:current.id,p_body:text});
     else await rpc("staff_send_group_message",{p_group_id:current.id,p_body:text});
     body.value="";await loadConversation();
   }catch(err){say(err.message||"Message could not be sent.");}finally{button.disabled=false;}
 });
 document.getElementById("permission-staff").addEventListener("change",loadPermissionChoices);
 document.getElementById("save-message-permissions").addEventListener("click",async()=>{
   const id=document.getElementById("permission-staff").value;
   const ids=[...document.querySelectorAll("#permission-recipients input:checked")].map(x=>x.value);
   try{await rpc("staff_set_message_recipients",{p_staff_id:id,p_recipient_ids:ids});say("Messaging access saved.",true);}catch(e){say(e.message||"Could not save messaging access.");}
 });
 document.getElementById("create-group-form").addEventListener("submit",async e=>{
   e.preventDefault();
   const name=document.getElementById("group-name").value.trim(),ids=[...document.querySelectorAll("#group-members input:checked")].map(x=>x.value);
   try{await rpc("staff_create_message_group",{p_name:name,p_member_ids:ids});e.target.reset();say("Group chat created.",true);await loadDirectory();}catch(err){say(err.message||"Could not create group chat.");}
 });
 try{await loadDirectory();}catch(e){say(e.message||"Could not load messenger.");}
});