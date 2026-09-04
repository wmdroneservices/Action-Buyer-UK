import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.177";
import nodemailer from "npm:nodemailer@7.0.6";
import { simpleParser } from "npm:mailparser@3.7.2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:any)=>String(v||"").trim().replace(/[\r\n]/g,"");
const validEmail=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const env=(n:string,...f:string[])=>Deno.env.get(n)||f.map(x=>Deno.env.get(x)).find(Boolean)||"";

async function access(req:Request){
 const h=req.headers.get("Authorization");if(!h)throw Error("Authentication required");
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:h}}}),{data:{user},error}=await userClient.auth.getUser();
 if(error||!user)throw Error("Invalid session");
 const admin=createClient(url,service),{data:staff}=await admin.from("staff_users").select("active,can_manage_staff,can_access_mail,mailbox_access,business_email").eq("user_id",user.id).maybeSingle();
 if(!staff?.active)throw Error("Active staff account required");
 if(!staff.can_manage_staff&&!staff.can_access_mail)throw Error("Mail access is not enabled for this staff account");
 const allowed=new Set(Array.isArray(staff.mailbox_access)?staff.mailbox_access.map((x:any)=>String(x)):[]);
 return {admin,user,staff,allowed,isManager:!!staff.can_manage_staff};
}
function managerOnly(ctx:any){if(!ctx.isManager)throw Error("Management access required");}

function toBase64(bytes:Uint8Array){let s="";const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return btoa(s);}
async function parseEmail(source:string){const p=await simpleParser(source);const map=(a:any)=>Array.isArray(a)?a.map((x:any)=>({name:x.name||"",address:x.address||""})):[];return {text:p.text||"",html:typeof p.html==="string"?p.html:"",from:map(p.from?.value),to:map(p.to?.value),cc:map(p.cc?.value),replyTo:map(p.replyTo?.value),attachments:(p.attachments||[]).map((a:any,i:number)=>({index:i,filename:a.filename||"attachment",content_type:a.contentType||"application/octet-stream",size:a.size||a.content?.length||0,content_id:a.cid||null}))};}
function defaultBox(){return {id:"default",email_address:env("PURELYMAIL_SMTP_USER","PURELYMAIL_QUOTE_SMTP_USER")||env("PURELYMAIL_IMAP_USER")||"Primary mailbox",display_name:"Primary business mailbox",mailbox_type:"management",secret_prefix:"PURELYMAIL",active:true,configured:true};}
function cfg(box:any){
 const p=String(box.secret_prefix||"");
 // Existing GearCashOut business credentials: info uses the original PURELYMAIL names,
 // while quote uses the dedicated PURELYMAIL_QUOTE names.
 if(box.id==="default"||p==="PURELYMAIL_INFO")return {smtpUser:env("PURELYMAIL_SMTP_USER"),smtpPass:env("PURELYMAIL_SMTP_PASS"),imapUser:env("PURELYMAIL_IMAP_USER","PURELYMAIL_SMTP_USER"),imapPass:env("PURELYMAIL_IMAP_PASS","PURELYMAIL_SMTP_PASS")};
 if(p==="PURELYMAIL_QUOTE")return {smtpUser:env("PURELYMAIL_QUOTE_SMTP_USER"),smtpPass:env("PURELYMAIL_QUOTE_SMTP_PASS"),imapUser:env("PURELYMAIL_QUOTE_IMAP_USER","PURELYMAIL_QUOTE_SMTP_USER"),imapPass:env("PURELYMAIL_QUOTE_IMAP_PASS","PURELYMAIL_QUOTE_SMTP_PASS")};
 return {smtpUser:env(p+"_SMTP_USER"),smtpPass:env(p+"_SMTP_PASS"),imapUser:env(p+"_IMAP_USER",p+"_SMTP_USER"),imapPass:env(p+"_IMAP_PASS",p+"_SMTP_PASS")};
}
async function boxes(admin:any,ctx:any){
 const {data,error}=await admin.from("business_mailboxes").select("id,email_address,display_name,mailbox_type,staff_user_id,secret_prefix,active").eq("active",true).order("created_at");
 if(error)throw error;
 const primary=defaultBox();
 let rows=(data||[]);
 if(!rows.some((x:any)=>x.email_address===primary.email_address))rows=[primary,...rows];
 if(!ctx.isManager)rows=rows.filter((x:any)=>String(x.staff_user_id||"")===String(ctx.user.id)||ctx.allowed.has(String(x.id)));
 return rows.map((x:any)=>{const c=cfg(x);return {...x,smtpConfigured:!!(c.smtpUser&&c.smtpPass),imapConfigured:!!(c.imapUser&&c.imapPass)}});
}
async function boxFor(admin:any,ctx:any,id:string){const all=await boxes(admin,ctx);const box=all.find((x:any)=>String(x.id)===String(id||"default"));if(!box)throw Error("You are not authorised to access this mailbox.");return box;}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const ctx=await access(req),{admin}=ctx,body=await req.json().catch(()=>({})),action=String(body.action||"status");
  if(action==="status"||action==="mailboxes")return json({ok:true,mailboxes:await boxes(admin,ctx)});
  if(action==="staff"){managerOnly(ctx);const {data,error}=await admin.from("staff_users").select("user_id,display_name,username,business_email,active").eq("active",true).order("display_name");if(error)throw error;return json({ok:true,staff:data||[]});}
  if(action==="add_mailbox"){managerOnly(ctx);
   const email=clean(body.email_address).toLowerCase(),display=clean(body.display_name)||email,type=["shared","management","staff"].includes(body.mailbox_type)?body.mailbox_type:"shared",staffId=body.staff_user_id||null;
   if(!validEmail(email))return json({error:"Enter a valid business email address."},400);
   const prefix="PURELYMAIL_MAILBOX_"+email.toUpperCase().replace(/[^A-Z0-9]/g,"_");
   const {data,error}=await admin.from("business_mailboxes").upsert({email_address:email,display_name:display,mailbox_type:type,staff_user_id:staffId,secret_prefix:prefix,active:true,updated_at:new Date().toISOString()},{onConflict:"email_address"}).select().single();
   if(error)throw error;
   return json({ok:true,mailbox:data,secretPrefix:prefix});
  }
  if(action==="remove_mailbox"){managerOnly(ctx);
   if(String(body.mailbox_id)==="default")return json({error:"The primary mailbox cannot be removed here."},400);
   const {error}=await admin.from("business_mailboxes").update({active:false,updated_at:new Date().toISOString()}).eq("id",body.mailbox_id);if(error)throw error;
   return json({ok:true});
  }

  const box=await boxFor(admin,ctx,String(body.mailbox_id||"default")),c=cfg(box);
  if(action==="folders"||action==="messages"||action==="message"||action==="attachment"||action==="archive"||action==="delete"){
   if(!c.imapUser||!c.imapPass)return json({error:"This mailbox has not had its IMAP credentials configured yet."},503);
   const client=new ImapFlow({host:"imap.purelymail.com",port:993,secure:true,auth:{user:c.imapUser,pass:c.imapPass},logger:false});
   try{
    await client.connect();
    if(action==="folders"){const list=await client.list();return json({ok:true,folders:list.map((f:any)=>({path:f.path,name:f.name,specialUse:f.specialUse||null}))});}
    const folder=String(body.folder||"INBOX"),lock=await client.getMailboxLock(folder);
    try{
     if(action==="messages"){const status=await client.status(folder,{messages:true,unseen:true}),total=Number(status.messages||0),start=Math.max(1,total-49),messages:any[]=[];if(total>0)for await(const m of client.fetch(`${start}:*`,{uid:true,envelope:true,flags:true,internalDate:true}))messages.push({uid:m.uid,subject:m.envelope?.subject||"(No subject)",from:(m.envelope?.from||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),to:(m.envelope?.to||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),date:m.envelope?.date||m.internalDate||null,seen:(m.flags||new Set()).has("\\Seen")});messages.reverse();return json({ok:true,folder,total,unseen:Number(status.unseen||0),messages});}
     const uid=Number(body.uid);if(!uid)return json({error:"Message UID is required"},400);
     if(action==="archive"||action==="delete"){
      const folders=await client.list();
      const wanted=action==="archive"?"\\Archive":"\\Trash";
      const fallback=action==="archive"?["archive"]:["trash","bin","deleted items"];
      const destination=folders.find((f:any)=>String(f.specialUse||"").toLowerCase()===wanted.toLowerCase())||folders.find((f:any)=>fallback.includes(String(f.name||f.path||"").toLowerCase()));
      if(!destination)return json({error:action==="archive"?"No Archive folder was found for this mailbox.":"No Trash folder was found for this mailbox."},409);
      const moved=await client.messageMove(uid,destination.path,{uid:true});
      if(!moved)throw Error("The message could not be moved.");
      return json({ok:true,moved:true,destination:{path:destination.path,name:destination.name||destination.path},action});
     }
     const m=await client.fetchOne(uid,{uid:true,envelope:true,source:true,internalDate:true},{uid:true});if(!m)return json({error:"Message not found"},404);
     const raw=m.source?new TextDecoder().decode(m.source):"",parsed=await parseEmail(raw);
     if(action==="attachment"){const index=Number(body.index),p=await simpleParser(raw),a=p.attachments?.[index];if(!Number.isInteger(index)||!a)return json({error:"Attachment not found"},404);const bytes=a.content instanceof Uint8Array?a.content:new Uint8Array(a.content||[]);if(bytes.length>15*1024*1024)return json({error:"This attachment is too large to download through the management mail reader."},413);return json({ok:true,filename:a.filename||"attachment",content_type:a.contentType||"application/octet-stream",content_base64:toBase64(bytes)});}
     return json({ok:true,uid:m.uid,subject:m.envelope?.subject||"(No subject)",from:parsed.from,to:parsed.to,cc:parsed.cc,replyTo:parsed.replyTo,date:m.envelope?.date||m.internalDate||null,text:parsed.text,html:parsed.html,attachments:parsed.attachments});
    }finally{lock.release();}
   }finally{try{await client.logout();}catch(_){}}
  }
  if(action==="send"){
   if(!c.smtpUser||!c.smtpPass)return json({error:"This mailbox has not had its SMTP credentials configured yet."},503);
   const to=clean(body.to),subject=clean(body.subject),text=String(body.text||"");if(!to||!subject||!text)return json({error:"Recipient, subject and message are required"},400);
   const transporter=nodemailer.createTransport({host:"smtp.purelymail.com",port:465,secure:true,auth:{user:c.smtpUser,pass:c.smtpPass}});await transporter.verify();
   const info=await transporter.sendMail({from:c.smtpUser,to,subject,text,...(body.replyTo?{replyTo:clean(body.replyTo)}:{})});
   return json({ok:true,sent:true,messageId:info.messageId});
  }
  return json({error:"Unknown action"},400);
 }catch(e:any){return json({error:e?.message||"Mail operation failed"},400);}
});