document.addEventListener("DOMContentLoaded",async()=>{
  const auth=window.actionBuyerAuth;
  const form=document.getElementById("staff-login-form");
  const message=document.getElementById("staff-login-message");

  async function destination(session){
    if(!session?.user?.id)return null;
    const {data:staff,error}=await auth.supabase.from("staff_users")
      .select("username,display_name,active,can_access_research,can_access_purchasing,can_access_sales,can_access_customers,can_manage_staff")
      .eq("user_id",session.user.id).maybeSingle();
    if(error||!staff?.active)return null;
    if(staff.can_manage_staff)return "admin.html";
    if(staff.can_access_research)return "admin-research-pricing.html";
    if(staff.can_access_purchasing)return "admin-purchasing.html";
    if(staff.can_access_sales)return "admin-sales-dashboard.html";
    if(staff.can_access_customers)return "admin-customers.html";
    return null;
  }

  const existing=await auth.getSession();
  if(existing){const target=await destination(existing);if(target){location.href=target;return;}await auth.supabase.auth.signOut();}

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const username=document.getElementById("staff-user-id").value.trim();
    const password=document.getElementById("staff-password").value;
    message.textContent="Signing in...";message.className="form-message";
    const {data,error}=await auth.supabase.functions.invoke("staff-login",{body:{username,password}});
    if(error||!data?.access_token||!data?.refresh_token){message.textContent="Invalid User ID or password.";message.className="form-message error";return;}
    const {data:sessionData,error:sessionError}=await auth.supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
    if(sessionError){message.textContent="Could not start the staff session.";message.className="form-message error";return;}
    const target=await destination(sessionData.session);
    if(!target){await auth.supabase.auth.signOut();message.textContent="This account does not have active staff access.";message.className="form-message error";return;}
    location.href=target;
  });
});