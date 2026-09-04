import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const origins=new Set(["https://gearcashout.co.uk","https://www.gearcashout.co.uk"]);
const cors=(req:Request)=>({
  "Access-Control-Allow-Origin":origins.has(req.headers.get("Origin")||"")?(req.headers.get("Origin")||"https://gearcashout.co.uk"):"https://gearcashout.co.uk",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
});

function now(){
  const d=new Date();
  const day=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long"}).format(d).toLowerCase();
  const p=Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);
  const g=(t:string)=>p.find(x=>x.type===t)?.value||"00";
  return {day,time:g("hour")+":"+g("minute")};
}
function allowed(schedule:any,start:string|null,end:string|null){
  const n=now();
  if(schedule&&typeof schedule==="object"&&schedule[n.day]){
    const x=schedule[n.day];
    if(x.off)return false;
    start=x.start||null; end=x.end||null;
  }
  if(!start||!end)return true;
  return start<end?n.time>=start&&n.time<end:n.time>=start||n.time<end;
}

Deno.serve(async req=>{
  const H=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Invalid request"}),{status:405,headers:H});

  try{
    const b=await req.json().catch(()=>({}));
    const username=String(b.email||b.username||"").trim().toLowerCase();
    const password=String(b.password||"");
    if(!username||!password)return new Response(JSON.stringify({error:"Enter your staff email address and password."}),{status:400,headers:H});

    const url=Deno.env.get("SUPABASE_URL");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!service)throw Error("Staff login service is not configured.");

    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:staff,error}=await admin.from("staff_users")
      .select("user_id,username,active,work_start_time,work_end_time,work_schedule")
      .eq("username",username).maybeSingle();

    if(error)throw error;
    if(!staff?.active)return new Response(JSON.stringify({error:"Invalid email address or password."}),{status:401,headers:H});
    if(!allowed(staff.work_schedule,staff.work_start_time,staff.work_end_time))
      return new Response(JSON.stringify({error:"This staff account is not scheduled to work at this time. Please contact management."}),{status:403,headers:H});

    const {data:u,error:ue}=await admin.auth.admin.getUserById(staff.user_id);
    if(ue||!u.user?.email)return new Response(JSON.stringify({error:"Invalid email address or password."}),{status:401,headers:H});

    const ar=await fetch(url+"/auth/v1/token?grant_type=password",{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":service,"Authorization":"Bearer "+service},
      body:JSON.stringify({email:u.user.email,password})
    });
    const ab=await ar.json().catch(()=>({}));
    if(!ar.ok||!ab?.access_token||!ab?.refresh_token)
      return new Response(JSON.stringify({error:"Invalid email address or password."}),{status:401,headers:H});

    await admin.from("staff_activity_log").insert({
      staff_user_id:staff.user_id,
      action_type:"Staff login",
      action_category:"login",
      page:"staff-login.html",
      details:{username}
    });

    return new Response(JSON.stringify({access_token:ab.access_token,refresh_token:ab.refresh_token}),{headers:H});
  }catch(e){
    console.error("staff-login failed",e);
    return new Response(JSON.stringify({error:"Staff sign-in is temporarily unavailable. Please try again."}),{status:500,headers:H});
  }
});