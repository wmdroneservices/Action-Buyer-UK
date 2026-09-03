let catalogueRefreshTimer=null;
let catalogueLoadInProgress=false;

document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}

 const {data:staff,error}=await auth.supabase.from("staff_users")
   .select("username,display_name,active,can_access_research,can_access_purchasing,can_access_sales,can_access_customers,can_manage_staff")
   .eq("user_id",session.user.id).maybeSingle();

 if(error||!staff?.active){await auth.supabase.auth.signOut();location.href="staff-login.html";return;}

 const allowed={
   research:!!staff.can_access_research,
   purchasing:!!staff.can_access_purchasing,
   sales:!!staff.can_access_sales,
   customers:!!staff.can_access_customers,
   manage_staff:!!staff.can_manage_staff
 };

 document.querySelectorAll("[data-permission]").forEach(el=>{
   el.hidden=!allowed[el.dataset.permission];
 });

 const welcome=document.getElementById("staff-welcome");
 if(welcome)welcome.textContent="Signed in as "+(staff.display_name||staff.username||"Staff");

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

function buildBreakdown(rows,key,fallback){
 const counts=new Map();
 rows.forEach(row=>{
   const name=String(row[key]||fallback).trim()||fallback;
   counts.set(name,(counts.get(name)||0)+1);
 });
 return [...counts.entries()]
   .map(([name,count])=>({name,count}))
   .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}

function renderBreakdown(listId,items){
 const list=document.getElementById(listId);
 if(!list) return;

 list.innerHTML="";
 items.forEach(item=>{
   const row=document.createElement("div");
   row.style.cssText="display:flex;justify-content:space-between;gap:1rem;padding:.7rem .8rem;border:1px solid #d8dde3;background:#f8fafb;color:#102f4f";
   const name=document.createElement("span");
   name.textContent=item.name;
   const count=document.createElement("strong");
   count.textContent=formatCount(item.count);
   row.append(name,count);
   list.appendChild(row);
 });
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
       .select("manufacturer,category,active")
       .range(from,from+pageSize-1)
       .order("id",{ascending:true});

     if(error) throw error;
     rows.push(...(data||[]));
     if(!data||data.length<pageSize) break;
   }

   // Dashboard status is based on the catalogue's actual active flag,
   // not customer visibility, so the figures match Catalogue Control.
   const totalProducts=rows.length;
   const activeProducts=rows.filter(row=>row.active===true).length;
   const inactiveProducts=totalProducts-activeProducts;

   const total=document.getElementById("catalogue-total-count");
   const active=document.getElementById("catalogue-active-count");
   const inactive=document.getElementById("catalogue-inactive-count");

   if(total) total.textContent=formatCount(totalProducts);
   if(active) active.textContent=formatCount(activeProducts);
   if(inactive) inactive.textContent=formatCount(inactiveProducts);

   const categories=buildBreakdown(rows,"category","Uncategorised");
   const manufacturers=buildBreakdown(rows,"manufacturer","Unknown");

   const categoryTotal=document.getElementById("catalogue-category-total");
   if(categoryTotal) categoryTotal.textContent=formatCount(categories.length)+" categories";

   const manufacturerTotal=document.getElementById("catalogue-manufacturer-total");
   if(manufacturerTotal) manufacturerTotal.textContent=formatCount(manufacturers.length)+" manufacturers";

   renderBreakdown("catalogue-category-list",categories);
   renderBreakdown("catalogue-manufacturer-list",manufacturers);

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