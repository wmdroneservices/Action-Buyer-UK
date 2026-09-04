let catalogueRefreshTimer=null;
let catalogueLoadInProgress=false;

document.addEventListener("DOMContentLoaded",async()=>{
 if(window.__gearCashOutDashboardInitialised)return;
 window.__gearCashOutDashboardInitialised=true;
 document.body.classList.add("staff-permissions-loading");
 document.body.classList.remove("staff-permissions-ready");
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}

 const {data:staff,error}=await auth.supabase.from("staff_users")
   .select("username,display_name,active,can_access_research,can_access_purchasing,can_access_sales,can_access_customers,can_access_mail,can_manage_staff")
   .eq("user_id",session.user.id).maybeSingle();

 if(error||!staff?.active){await auth.supabase.auth.signOut();location.href="staff-login.html";return;}

 const allowed={
   research:!!staff.can_access_research,
   purchasing:!!staff.can_access_purchasing,
   sales:!!staff.can_access_sales,
   customers:!!staff.can_access_customers,
   manage_staff:!!staff.can_manage_staff,
   mail:!!staff.can_access_mail||!!staff.can_manage_staff
 };

 document.querySelectorAll("[data-permission]").forEach(el=>{
   el.hidden=!allowed[el.dataset.permission];
 });

 const welcome=document.getElementById("staff-welcome");
 if(welcome)welcome.textContent="Signed in as "+(staff.display_name||staff.username||"Staff");

 // Reveal permission-controlled navigation and dashboard cards only after the
 // staff record has been read and all permissions have been applied.
 document.body.classList.remove("staff-permissions-loading");
 document.body.classList.add("staff-permissions-ready");

 const signout=document.getElementById("staff-sign-out");
 if(signout)signout.addEventListener("click",()=>auth.signOut());

 const refresh=()=>loadCatalogueSummary(auth.supabase);
 await refresh();

 // Keep the dashboard genuinely live without relying on a hard page refresh.
 catalogueRefreshTimer=window.setInterval(refresh,30000);
 document.addEventListener("visibilitychange",()=>{
   if(document.visibilityState==="visible") refresh();
 });

 window.addEventListener("beforeunload",()=>{
   if(catalogueRefreshTimer) window.clearInterval(catalogueRefreshTimer);
 });
});

function formatCount(value){
 return Number(value||0).toLocaleString("en-GB");
}

function countQuery(supabase,table,apply){
 let query=supabase.from(table).select("*",{count:"exact",head:true});
 return apply?apply(query):query;
}

async function loadCatalogueSummary(supabase){
 const panel=document.getElementById("catalogue-summary-panel");
 if(!panel||catalogueLoadInProgress) return;

 catalogueLoadInProgress=true;
 const message=document.getElementById("catalogue-summary-message");

 try{
   const rows=[];
   const pageSize=1000;

   for(let from=0;;from+=pageSize){
     const {data,error}=await supabase
       .from("quote_catalog_products")
       .select("active")
       .range(from,from+pageSize-1)
       .order("id",{ascending:true});

     if(error) throw error;
     rows.push(...(data||[]));
     if(!data||data.length<pageSize) break;
   }

   const totalProducts=rows.length;
   const activeProducts=rows.filter(row=>row.active===true).length;
   const inactiveProducts=totalProducts-activeProducts;

   const total=document.getElementById("catalogue-total-count");
   const active=document.getElementById("catalogue-active-count");
   const inactive=document.getElementById("catalogue-inactive-count");

   if(total) total.textContent=formatCount(totalProducts);
   if(active) active.textContent=formatCount(activeProducts);
   if(inactive) inactive.textContent=formatCount(inactiveProducts);

   if(message) message.textContent="";
   panel.hidden=false;
 }catch(err){
   console.error("Unable to load catalogue summary",err);
   if(message) message.textContent="Catalogue summary could not be loaded: "+(err?.message||"Unknown error");
   panel.hidden=false;
 }finally{
   catalogueLoadInProgress=false;
 }
}
