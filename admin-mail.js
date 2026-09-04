(function(){
'use strict';
let currentFolder='INBOX', selectedUid=null;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function addr(list){return (list||[]).map(x=>x.name?x.name+' <'+x.address+'>':x.address).join(', ');}
function date(v){try{return v?new Date(v).toLocaleString('en-GB'):''}catch(_){return ''}}
function message(text,error=false){const el=document.getElementById('mail-message');if(!el)return;el.textContent=text||'';el.className='form-message'+(error?' error':'');}

async function invoke(action,payload={}){
 const sb=window.actionBuyerAuth?.supabase;
 if(!sb)throw new Error('Secure connection is not available.');
 const {data,error}=await sb.functions.invoke('management-mail',{body:{action,...payload}});
 if(error)throw error;
 if(data?.error)throw new Error(data.error);
 return data;
}

async function checkAccess(){
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession();
 if(!session){location.href='staff-login.html';return false;}
 const {data:staff,error}=await auth.supabase.from('staff_users').select('active,can_manage_staff').eq('user_id',session.user.id).maybeSingle();
 if(error||!staff?.active||!staff?.can_manage_staff){await auth.signOut();location.href='staff-login.html';return false;}
 return true;
}

async function loadFolders(){
 const data=await invoke('folders');
 const box=document.getElementById('mail-folders');
 const folders=(data.folders||[]).filter(f=>f.path);
 box.innerHTML='';
 folders.forEach(f=>{
   const b=document.createElement('button');
   b.type='button';b.className='mail-folder'+(f.path===currentFolder?' active':'');
   b.dataset.folder=f.path;b.textContent=(f.specialUse||'').toUpperCase()==='\\INBOX'?'INBOX':f.name;
   b.addEventListener('click',()=>{currentFolder=f.path;selectedUid=null;document.getElementById('mail-folder-title').textContent=f.name;document.querySelectorAll('.mail-folder').forEach(x=>x.classList.toggle('active',x===b));loadMessages();});
   box.appendChild(b);
 });
 if(!folders.some(f=>f.path===currentFolder)){currentFolder=folders[0]?.path||'INBOX';}
}

async function loadMessages(){
 const list=document.getElementById('mail-list');
 list.innerHTML='<p style="padding:1rem">Loading messages...</p>';
 try{
   const data=await invoke('messages',{folder:currentFolder});
   document.getElementById('mail-folder-title').textContent=currentFolder;
   if(!data.messages?.length){list.innerHTML='<div class="empty-account"><h3>No messages</h3><p>This folder is empty.</p></div>';return;}
   list.innerHTML='';
   data.messages.forEach(m=>{
     const b=document.createElement('button');b.type='button';b.className='mail-item'+(!m.seen?' unread':'')+(selectedUid===m.uid?' active':'');
     b.innerHTML='<div class="mail-item-row"><span>'+esc((m.from?.[0]?.name||m.from?.[0]?.address||'Unknown'))+'</span><span>'+esc(date(m.date))+'</span></div><div class="mail-item-subject">'+esc(m.subject)+'</div>';
     b.addEventListener('click',()=>openMessage(m.uid,b));
     list.appendChild(b);
   });
 }catch(err){list.innerHTML='<p style="padding:1rem">Unable to load messages.</p>';message(err.message,true);}
}

async function openMessage(uid,button){
 selectedUid=uid;
 document.querySelectorAll('.mail-item').forEach(x=>x.classList.toggle('active',x===button));
 document.getElementById('mail-compose-form').hidden=true;
 document.getElementById('mail-reader-empty').hidden=true;
 const article=document.getElementById('mail-reader-content');article.hidden=false;
 document.getElementById('mail-subject').textContent='Loading...';
 document.getElementById('mail-meta').textContent='';
 document.getElementById('mail-body').textContent='';
 try{
   const data=await invoke('message',{folder:currentFolder,uid});
   document.getElementById('mail-subject').textContent=data.subject;
   document.getElementById('mail-meta').textContent='From: '+addr(data.from)+'\nTo: '+addr(data.to)+'\n'+date(data.date);
   document.getElementById('mail-body').textContent=stripRaw(data.raw||'');
 }catch(err){document.getElementById('mail-body').textContent='Unable to open this message.';message(err.message,true);}
}

function stripRaw(raw){
 const split=raw.split(/\r?\n\r?\n/);
 if(split.length<2)return raw;
 let body=split.slice(1).join('\n\n');
 if(/content-transfer-encoding:\s*base64/i.test(split[0])){
   try{body=atob(body.replace(/\s/g,''));}catch(_){}
 }
 return body.replace(/<[^>]+>/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}

function compose(){
 document.getElementById('mail-reader-content').hidden=true;
 document.getElementById('mail-reader-empty').hidden=true;
 document.getElementById('mail-compose-form').hidden=false;
 document.getElementById('compose-to').focus();
}

document.addEventListener('DOMContentLoaded',async()=>{
 if(!await checkAccess())return;
 document.getElementById('mail-compose').addEventListener('click',compose);
 document.getElementById('mail-refresh').addEventListener('click',async()=>{message('');await loadMessages();});
 document.getElementById('mail-cancel-compose').addEventListener('click',()=>{document.getElementById('mail-compose-form').hidden=true;document.getElementById('mail-reader-empty').hidden=false;});
 document.getElementById('mail-compose-form').addEventListener('submit',async e=>{
   e.preventDefault();
   const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
   button.disabled=true;button.textContent='SENDING...';message('');
   try{
     await invoke('send',{to:document.getElementById('compose-to').value,subject:document.getElementById('compose-subject').value,text:document.getElementById('compose-text').value});
     form.reset();form.hidden=true;document.getElementById('mail-reader-empty').hidden=false;message('Email sent successfully.');
   }catch(err){message(err.message,true);}
   finally{button.disabled=false;button.textContent='SEND EMAIL';}
 });
 try{
   const status=await invoke('status');
   const text=document.getElementById('mail-status-text');
   if(status.smtpConfigured&&status.imapConfigured){
     text.textContent='Purelymail is securely configured. Inbox access and sending are ready.';
     document.getElementById('mail-workspace').hidden=false;
     await loadFolders();await loadMessages();
   }else if(status.smtpConfigured){
     text.textContent='Sending is configured. Inbox access still needs IMAP credentials enabled.';
     document.getElementById('mail-workspace').hidden=false;
   }else{
     text.textContent='The secure Purelymail credentials have not been configured yet.';
   }
 }catch(err){document.getElementById('mail-status-text').textContent='Unable to verify the mail connection: '+err.message;message(err.message,true);}
});
})();