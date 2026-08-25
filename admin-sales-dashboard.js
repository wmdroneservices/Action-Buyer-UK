document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth; if(!auth)return;
  const session=await auth.getSession(); if(!session){location.href="login.html?return=admin-sales-dashboard.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff){location.href="account.html";return;}
  const message=document.getElementById("staff-message");
  const notice=(text,ok=true)=>{if(message){message.textContent=text;message.className="form-message "+(ok?"success":"error");}};
  document.getElementById("staff-welcome").textContent=`Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click",async()=>{const b=document.getElementById("staff-sign-out");b.disabled=true;try{await auth.signOut();}catch(e){b.disabled=false;notice(e?.message||"Could not sign out.",false);}});
  async function load(){
    const {data:assets,error}=await auth.supabase.from("inventory_assets").select("id,status");
    if(error){notice("Could not load Sales Dashboard counts.",false);return;}
    const rows=assets||[];
    const count=s=>rows.filter(a=>a.status===s).length;
    document.getElementById("sent-count").textContent=count("Sent to Sales");
    document.getElementById("listed-count").textContent=count("Listed");
    document.getElementById("reserved-count").textContent=count("Reserved");
    document.getElementById("sold-count").textContent=count("Sold");
    document.getElementById("returned-count").textContent=count("Returned");
    const {data:listings,error:le}=await auth.supabase.from("resale_listings").select("id,status");
    if(le){notice("Could not load sales listing counts.",false);return;}
    document.getElementById("delist-count").textContent=(listings||[]).filter(x=>x.status==="Delist Required").length;
  }
  await load();setInterval(()=>{if(!document.hidden)load();},5000);
});
