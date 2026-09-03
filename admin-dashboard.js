document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession();
 if(!session){location.href="staff-login.html";return;}
 const {data:staff,error}=await auth.supabase.from("staff_users")
   .select("username,display_name,active,can_access_research,can_access_purchasing,can_access_sales,can_access_customers,can_manage_staff")
   .eq("user_id",session.user.id).maybeSingle();
 if(error||!staff?.active){await auth.supabase.auth.signOut();location.href="staff-login.html";return;}
 const allowed={research:!!staff.can_access_research,purchasing:!!staff.can_access_purchasing,sales:!!staff.can_access_sales,customers:!!staff.can_access_customers,manage_staff:!!staff.can_manage_staff};
 document.querySelectorAll("[data-permission]").forEach(el=>{el.hidden=!allowed[el.dataset.permission];});
 const welcome=document.getElementById("staff-welcome");
 if(welcome)welcome.textContent="Signed in as "+(staff.display_name||staff.username||"Staff");
 const signout=document.getElementById("staff-sign-out");
 if(signout)signout.addEventListener("click",()=>auth.signOut());
});