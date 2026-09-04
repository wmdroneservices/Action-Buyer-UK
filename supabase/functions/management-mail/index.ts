import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.177";
import nodemailer from "npm:nodemailer@7.0.6";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

function envSecret(name:string,...fallback:string[]){
  return Deno.env.get(name)||fallback.map(k=>Deno.env.get(k)).find(Boolean)||"";
}

async function requireManager(req:Request){
  const authHeader=req.headers.get("Authorization");
  if(!authHeader) throw Object.assign(new Error("Authentication required"),{status:401});
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const secretMap=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const serviceKey=secretMap.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!serviceKey) throw Object.assign(new Error("Server configuration is incomplete"),{status:500});

  const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
  const {data:{user},error}=await userClient.auth.getUser();
  if(error||!user) throw Object.assign(new Error("Invalid session"),{status:401});

  const admin=createClient(url,serviceKey);
  const {data:staff}=await admin.from("staff_users")
    .select("user_id,active,can_manage_staff")
    .eq("user_id",user.id).maybeSingle();
  if(!staff?.active||!staff?.can_manage_staff) throw Object.assign(new Error("Management access required"),{status:403});
  return {user,admin};
}

function config(){
  const smtpUser=envSecret("PURELYMAIL_SMTP_USER","PURELYMAIL_QUOTE_SMTP_USER");
  const smtpPass=envSecret("PURELYMAIL_SMTP_PASS","PURELYMAIL_QUOTE_SMTP_PASS");
  const imapUser=envSecret("PURELYMAIL_IMAP_USER","PURELYMAIL_SMTP_USER","PURELYMAIL_QUOTE_SMTP_USER");
  const imapPass=envSecret("PURELYMAIL_IMAP_PASS","PURELYMAIL_SMTP_PASS","PURELYMAIL_QUOTE_SMTP_PASS");
  return {smtpUser,smtpPass,imapUser,imapPass};
}

function cleanAddress(value:string){
  return String(value||"").trim().replace(/[\r\n]/g,"");
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    await requireManager(req);
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"status");
    const cfg=config();

    if(action==="status"){
      return json({
        ok:true,
        smtpConfigured:!!(cfg.smtpUser&&cfg.smtpPass),
        imapConfigured:!!(cfg.imapUser&&cfg.imapPass),
        from:cfg.smtpUser||null
      });
    }

    if(action==="folders"||action==="messages"||action==="message"){
      if(!cfg.imapUser||!cfg.imapPass) return json({error:"Purelymail IMAP is not configured yet."},503);

      const client=new ImapFlow({
        host:"imap.purelymail.com",
        port:993,
        secure:true,
        auth:{user:cfg.imapUser,pass:cfg.imapPass},
        logger:false
      });

      try{
        await client.connect();

        if(action==="folders"){
          const list=await client.list();
          return json({ok:true,folders:list.map((f:any)=>({
            path:f.path,
            name:f.name,
            specialUse:f.specialUse||null
          }))});
        }

        const folder=String(body.folder||"INBOX");
        const lock=await client.getMailboxLock(folder);
        try{
          if(action==="messages"){
            const status=await client.status(folder,{messages:true,unseen:true});
            const total=Number(status.messages||0);
            const start=Math.max(1,total-49);
            const rows:any[]=[];
            if(total>0){
              for await(const msg of client.fetch(`${start}:*`,{uid:true,envelope:true,flags:true,internalDate:true})){
                rows.push({
                  uid:msg.uid,
                  subject:msg.envelope?.subject||"(No subject)",
                  from:(msg.envelope?.from||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),
                  to:(msg.envelope?.to||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),
                  date:msg.envelope?.date||msg.internalDate||null,
                  seen:(msg.flags||new Set()).has("\\Seen")
                });
              }
            }
            rows.reverse();
            return json({ok:true,folder,total,unseen:Number(status.unseen||0),messages:rows});
          }

          const uid=Number(body.uid);
          if(!uid) return json({error:"Message UID is required"},400);
          const msg=await client.fetchOne(uid,{uid:true,envelope:true,source:true,internalDate:true},{uid:true});
          if(!msg) return json({error:"Message not found"},404);
          const raw=msg.source?new TextDecoder().decode(msg.source):"";
          return json({
            ok:true,
            uid:msg.uid,
            subject:msg.envelope?.subject||"(No subject)",
            from:(msg.envelope?.from||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),
            to:(msg.envelope?.to||[]).map((x:any)=>({name:x.name||"",address:x.address||""})),
            date:msg.envelope?.date||msg.internalDate||null,
            raw
          });
        } finally {lock.release();}
      } finally {
        try{await client.logout();}catch(_){}
      }
    }

    if(action==="send"){
      if(!cfg.smtpUser||!cfg.smtpPass) return json({error:"Purelymail SMTP is not configured yet."},503);
      const to=cleanAddress(body.to);
      const subject=cleanAddress(body.subject);
      const text=String(body.text||"");
      if(!to||!subject||!text) return json({error:"Recipient, subject and message are required"},400);

      const transporter=nodemailer.createTransport({
        host:"smtp.purelymail.com",port:465,secure:true,
        auth:{user:cfg.smtpUser,pass:cfg.smtpPass}
      });
      await transporter.verify();
      const info=await transporter.sendMail({
        from:cfg.smtpUser,to,subject,text,
        ...(body.replyTo?{replyTo:cleanAddress(body.replyTo)}:{})
      });
      return json({ok:true,sent:true,messageId:info.messageId});
    }

    return json({error:"Unknown action"},400);
  }catch(error:any){
    return json({error:error?.message||"Mail operation failed"},Number(error?.status)||500);
  }
});