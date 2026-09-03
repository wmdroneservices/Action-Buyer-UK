document.addEventListener("DOMContentLoaded",async()=>{
  const auth=window.actionBuyerAuth;
  const form=document.getElementById("staff-login-form");
  const message=document.getElementById("staff-login-message");
  const emailFor=username=>"staff+"+username.trim().toLowerCase()+"@internal.gearcashout.local";

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
    const {data,error}=await auth.supabase.auth.signInWithPassword({email:emailFor(username),password});
    if(error){message.textContent="Invalid User ID or password.";message.className="form-message error";return;}
    const target=await destination(data.session);
    if(!target){await auth.supabase.auth.signOut();message.textContent="This account does not have active staff access.";message.className="form-message error";return;}
    location.href=target;
  });
});