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

function countQuery(supabase,table,apply){
 let query=supabase.from(table).select("*",{count:"exact",head:true});
 return apply?apply(query):query;
}

function makeTodoItem({count,title,description,href,permission},allowed){
 if(!count||count<=0) return null;
 if(permission&&!allowed[permission]) return null;

 const row=document.createElement("a");
 row.href=href;
 row.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border:1px solid #d8dde3;background:#f8fafb;color:#102f4f;text-decoration:none";

 const left=document.createElement("div");
 left.style.cssText="display:flex;align-items:center;gap:.9rem;min-width:0";

 const badge=document.createElement("strong");
 badge.textContent=formatCount(count);
 badge.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-width:2.5rem;height:2.5rem;padding:0 .6rem;background:#102f4f;color:#fff;font-size:1rem";

 const copy=document.createElement("div");
 const heading=document.createElement("strong");
 heading.textContent=title;
 heading.style.cssText="display:block;color:#102f4f";
 const detail=document.createElement("span");
 detail.textContent=description;
 detail.style.cssText="display:block;font-size:.78rem;color:#5f6b78;margin-top:.2rem";
 copy.append(heading,detail);
 left.append(badge,copy);

 const action=document.createElement("span");
 action.textContent="OPEN";
 action.className="btn btn-primary";
 action.style.cssText="flex:0 0 auto";
 row.append(left,action);
 return row;
}

async function loadDashboardTodo(supabase,allowed){
 const list=document.getElementById("dashboard-todo-list");
 const message=document.getElementById("dashboard-todo-message");
 if(!list) return;

 try{
   const requests=[];

   if(allowed.purchasing){
     requests.push(
       countQuery(supabase,"valuations",q=>q.in("status",["submitted","manual_review"])),
       countQuery(supabase,"valuations",q=>q.eq("status","customer_review")),
       countQuery(supabase,"purchase_return_cases",q=>q.neq("status","closed"))
     );
   }

   if(allowed.sales){
     requests.push(
       countQuery(supabase,"inventory_assets",q=>q.in("status",["Inspection Required","Testing","Repair Required"])),
       countQuery(supabase,"inventory_assets",q=>q.eq("status","Ready for Resale")),
       countQuery(supabase,"resale_listings",q=>q.in("status",["Draft","Ready For Listing","Delist Required"])),
       countQuery(supabase,"customer_return_requests",q=>q.not("status","in", "(Closed,Return Refused)"))
     );
   }

   const results=await Promise.all(requests);
   let i=0;
   const nextCount=()=>results[i++]?.count||0;
   const items=[];

   if(allowed.purchasing){
     items.push(
       {count:nextCount(),title:"Valuations awaiting review",description:"New or manually flagged valuations need staff attention.",href:"admin-purchasing.html",permission:"purchasing"},
       {count:nextCount(),title:"Customer responses awaiting action",description:"Valuations are waiting for the next purchasing step.",href:"admin-purchasing.html",permission:"purchasing"},
       {count:nextCount(),title:"Purchase returns in progress",description:"Refused valuation items still need to be arranged, dispatched or closed.",href:"admin-purchase-returns.html",permission:"purchasing"}
     );
   }

   if(allowed.sales){
     items.push(
       {count:nextCount(),title:"Inventory requiring inspection or testing",description:"Received stock needs checking before it can progress.",href:"admin-sales-dashboard.html",permission:"sales"},
       {count:nextCount(),title:"Items ready for resale",description:"Inventory is ready to move into the sales workflow.",href:"admin-sales-dashboard.html",permission:"sales"},
       {count:nextCount(),title:"Listings requiring action",description:"Draft, ready-to-list or delist-required listings need attention.",href:"admin-sales-dashboard.html",permission:"sales"},
       {count:nextCount(),title:"Customer returns in progress",description:"Post-sale returns are still active and require handling.",href:"admin-returns.html",permission:"sales"}
     );
   }

   list.innerHTML="";
   const actionable=items.filter(item=>item.count>0);
   if(actionable.length){
     actionable.forEach(item=>{
       const row=makeTodoItem(item,allowed);
       if(row) list.appendChild(row);
     });
   }else{
     const empty=document.createElement("div");
     empty.textContent="NO ACTIONS CURRENTLY REQUIRED";
     empty.style.cssText="padding:1rem;border:1px solid #5c8f7c;background:#eef7f2;color:#102f4f;font-weight:700;font-size:.78rem";
     list.appendChild(empty);
   }

   if(message) message.textContent="";
 }catch(err){
   console.error("Unable to load dashboard to-do list",err);
   if(message) message.textContent="To-do list could not be loaded: "+(err?.message||"Unknown error");
 }
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
