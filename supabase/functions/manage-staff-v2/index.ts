import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const H={"Access-Control-Allow-Origin":"https://gearcashout.co.uk","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const DAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const okT=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const okEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const authEmail=(u:string)=>String(u).trim().toLowerCase();
const prefix=(e:string)=>"PURELYMAIL_MAILBOX_"+e.toUpperCase().replace(/[^A-Z0-9]/g,"_");

function sched(x:any){if(x==null)return null;if(typeof x!=="object"||Array.isArray(x))throw Error("Invalid weekly work schedule.");const o:any={};for(const d of DAYS){const r=x[d]||{},off=!!r.off,a=r.start?String(r.start):null,b=r.end?String(r.end):null;if(off)o[d]={off:true,start:null,end:null};else{if(!!a!==!!b)throw Error("Each working day needs both a start and end time, or neither.");if(a&&(!okT(a)||!okT(b!)))throw Error("Invalid work time.");o[d]={off:false,start:a,end:b};}}return o}

function mailboxParts(email:string){const [userName,domainName]=email.trim().toLowerCase().split("@");if(!userName||!domainName)throw Error("Invalid staff mailbox address.");return {userName,domainName};}
async function purelymail(admin:any,path:string,body:any){
  const {data:token,error:tokenError}=await admin.rpc("get_purelymail_api_token");
  if(tokenError||!token)throw Error("Purelymail mailbox automation is not configured yet. Add the API key in Staff Management.");
  const r=await fetch("https://purelymail.com/api/v0/"+path,{method:"POST",headers:{"Content-Type":"application/json","Purelymail-Api-Token":String(token)},body:JSON.stringify(body)});
  const text=await r.text();let data:any={};try{data=text?JSON.parse(text):{};}catch{data={message:text};}
  if(!r.ok||data?.error)throw Error(data?.message||data?.error?.message||"Purelymail API request failed.");
  return data;
}
async function createMailbox(admin:any,email:string,password:string){
  const {userName,domainName}=mailboxParts(email);
  await purelymail(admin,"createUser",{userName,domainName,password,enablePasswordReset:true,enableSearchIndexing:true,sendWelcomeEmail:false});
}
async function deleteMailbox(admin:any,email:string){
  const {userName}=mailboxParts(email);
  await purelymail(admin,"deleteUser",{userName});
}
async function syncMailbox(admin:any,userId:string,email:string|null,displayName:string){
  if(!email)return;
  const {error}=await admin.from("business_mailboxes").upsert({email_address:email,display_name:displayName||email,mailbox_type:"staff",staff_user_id:userId,secret_prefix:prefix(email),active:true,purelymail_provisioned:true,purelymail_status:"provisioned",updated_at:new Date().toISOString()},{onConflict:"email_address"});
  if(error)throw error;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  try{
    const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});
    const {data:{user}}=await caller.auth.getUser();if(!user)throw Error("Unauthorized");
    const admin=createClient(url,service);
    const {data:m}=await admin.from("staff_users").select("active,can_manage_staff").eq("user_id",user.id).maybeSingle();
    if(!m?.active||!m.can_manage_staff)throw Error("Management access required");
    const b=await req.json().catch(()=>({})),act=String(b.action||"");

    if(act==="list"){
      const {data,error}=await admin.from("staff_users").select("user_id,username,display_name,business_email,can_access_research,can_access_purchasing,can_access_sales,can_access_customers,can_access_mail,mailbox_access,can_manage_staff,active,work_start_time,work_end_time,work_schedule,created_at,updated_at").order("created_at",{ascending:false});
      if(error)throw error;return new Response(JSON.stringify({staff:data||[]}),{headers:H});
    }
    if(act==="mailboxes"){
      const {data,error}=await admin.from("business_mailboxes").select("id,email_address,display_name,mailbox_type,active").eq("active",true).neq("mailbox_type","staff").order("created_at");
      if(error)throw error;return new Response(JSON.stringify({mailboxes:data||[]}),{headers:H});
    }
    if(act==="configure_purelymail"){
      const token=String(b.api_key||"").trim();if(token.length<10)throw Error("Enter a valid Purelymail API key.");
      const {error}=await admin.rpc("set_purelymail_api_token",{p_token:token});if(error)throw Error(error.message);
      return new Response(JSON.stringify({ok:true}),{headers:H});
    }
    if(act==="purelymail_status"){
      const {data:token,error}=await admin.rpc("get_purelymail_api_token");
      if(error)throw Error(error.message);
      return new Response(JSON.stringify({configured:!!token}),{headers:H});
    }
    if(act==="create"){
      const be=String(b.business_email||"").trim().toLowerCase(),p=String(b.password||""),dn=String(b.display_name||"").trim();
      if(!be||!okEmail(be)||p.length<8)throw Error("Enter a valid email address and a password of at least 8 characters.");
      const {data:existing}=await admin.from("staff_users").select("user_id").eq("username",be).maybeSingle();
      if(existing)throw Error("That email address is already being used by a staff account.");
      await createMailbox(admin,be,p);
      let createdUserId:string|null=null;
      try{
        const {data:c,error:ce}=await admin.auth.admin.createUser({email:authEmail(be),password:p,email_confirm:true,user_metadata:{staff_username:be,display_name:dn||be}});
        if(ce||!c.user)throw Error(ce?.message||"Could not create staff account.");createdUserId=c.user.id;
        const q=b.permissions||{},row:any={user_id:c.user.id,username:be,display_name:dn||be,business_email:be,can_access_research:!!q.research,can_access_purchasing:!!q.purchasing,can_access_sales:!!q.sales,can_access_customers:!!q.customers,can_manage_staff:!!q.manage_staff,can_access_mail:true,mailbox_access:Array.isArray(b.mailbox_access)?[...new Set(b.mailbox_access.map((x:any)=>String(x)).filter(Boolean))]:[],active:true,work_schedule:sched(b.work_schedule),updated_at:new Date().toISOString()};
        const {error}=await admin.from("staff_users").insert(row);if(error)throw error;
        await syncMailbox(admin,c.user.id,be,row.display_name);
        return new Response(JSON.stringify({staff:row,mailbox_created:true}),{headers:H});
      }catch(e){
        if(createdUserId)await admin.auth.admin.deleteUser(createdUserId).catch(()=>{});
        await deleteMailbox(admin,be).catch(()=>{});
        throw e;
      }
    }
    if(act==="update"){
      const id=String(b.user_id||"");if(!id)throw Error("Missing staff user");
      const {data:cur}=await admin.from("staff_users").select("business_email,display_name").eq("user_id",id).maybeSingle();if(!cur)throw Error("Staff account not found.");
      const patch:any={updated_at:new Date().toISOString()};
      ["display_name","username"].forEach(k=>{if(typeof b[k]==="string")patch[k]=b[k].trim()});
      if(patch.username){patch.username=patch.username.toLowerCase();if(!okEmail(patch.username))throw Error("The staff login must be a valid email address.");}
      if(typeof b.active==="boolean")patch.active=b.active;
      if(b.business_email!==undefined){const be=String(b.business_email||"").trim().toLowerCase()||null;if(!be||!okEmail(be))throw Error("Enter a valid business email address.");if(cur.business_email&&be!==cur.business_email)throw Error("Changing a staff email address is not automated yet because it would require renaming the Purelymail mailbox. Create the correct account instead.");patch.business_email=be;patch.username=be;}
      if(b.work_schedule!==undefined)patch.work_schedule=sched(b.work_schedule);
      if(b.permissions){const q=b.permissions;patch.can_access_research=!!q.research;patch.can_access_purchasing=!!q.purchasing;patch.can_access_sales=!!q.sales;patch.can_access_customers=!!q.customers;patch.can_manage_staff=!!q.manage_staff;}
      if(b.can_access_mail!==undefined)patch.can_access_mail=!!b.can_access_mail;
      if(Array.isArray(b.mailbox_access))patch.mailbox_access=[...new Set(b.mailbox_access.map((x:any)=>String(x)).filter(Boolean))];
      if(patch.business_email){const {error:ae}=await admin.auth.admin.updateUserById(id,{email:patch.business_email,email_confirm:true,user_metadata:{staff_username:patch.business_email,display_name:patch.display_name||cur.display_name}});if(ae)throw Error(ae.message);}
      const {data,error}=await admin.from("staff_users").update(patch).eq("user_id",id).select().single();if(error)throw error;
      await syncMailbox(admin,id,data.business_email,data.display_name);
      return new Response(JSON.stringify({staff:data}),{headers:H});
    }
    if(act==="reset_password"){
      const id=String(b.user_id||""),p=String(b.password||"");if(p.length<8)throw Error("Password must be at least 8 characters.");
      const {data:staff}=await admin.from("staff_users").select("business_email").eq("user_id",id).maybeSingle();if(!staff?.business_email)throw Error("Staff mailbox not found.");
      const {userName}=mailboxParts(staff.business_email);
      await purelymail(admin,"modifyUser",{userName,newPassword:p});
      const {error}=await admin.auth.admin.updateUserById(id,{password:p});if(error)throw error;
      return new Response(JSON.stringify({ok:true}),{headers:H});
    }
    if(act==="delete"){
      const id=String(b.user_id||"");if(id===user.id)throw Error("You cannot delete the account you are using.");
      const {data:staff}=await admin.from("staff_users").select("business_email").eq("user_id",id).maybeSingle();
      if(staff?.business_email)await deleteMailbox(admin,staff.business_email);
      await admin.from("business_mailboxes").update({active:false}).eq("staff_user_id",id);
      const {error}=await admin.from("staff_users").delete().eq("user_id",id);if(error)throw error;
      await admin.auth.admin.deleteUser(id);
      return new Response(JSON.stringify({ok:true,mailbox_deleted:!!staff?.business_email}),{headers:H});
    }
    throw Error("Unknown action");
  }catch(e){
    return new Response(JSON.stringify({error:e instanceof Error?e.message:"Server error"}),{status:400,headers:H});
  }
});