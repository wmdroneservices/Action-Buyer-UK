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

 if(allowed.purchasing) loadCatalogueSummary(auth.supabase);
});

async function loadCatalogueSummary(supabase){
 const panel=document.getElementById("catalogue-summary-panel");
 if(!panel) return;

 const message=document.getElementById("catalogue-summary-message");
 try{
   const {data,error}=await supabase.rpc("get_staff_catalogue_dashboard_summary");
   if(error) throw error;

   const summary=data||{};
   const format=value=>Number(value||0).toLocaleString("en-GB");

   const total=document.getElementById("catalogue-total-count");
   const active=document.getElementById("catalogue-active-count");
   const inactive=document.getElementById("catalogue-inactive-count");

   if(total) total.textContent=format(summary.total_products);
   if(active) active.textContent=format(summary.active_products);
   if(inactive) inactive.textContent=format(summary.inactive_products);

   const categories=Array.isArray(summary.categories)?summary.categories:[];
   const categoryTotal=document.getElementById("catalogue-category-total");
   if(categoryTotal) categoryTotal.textContent=format(categories.length)+" categories";

   const list=document.getElementById("catalogue-category-list");
   if(list){
     list.innerHTML="";
     categories.forEach(category=>{
       const row=document.createElement("div");
       row.style.cssText="display:flex;justify-content:space-between;gap:1rem;padding:.7rem .8rem;border:1px solid #d8dde3;background:#f8fafb;color:#102f4f";
       const name=document.createElement("span");
       name.textContent=category.name||"Uncategorised";
       const count=document.createElement("strong");
       count.textContent=format(category.count);
       row.append(name,count);
       list.appendChild(row);
     });
   }

   panel.hidden=false;
 }catch(err){
   console.error("Unable to load catalogue summary",err);
   if(message) message.textContent="Catalogue summary could not be loaded.";
   panel.hidden=false;
 }
}