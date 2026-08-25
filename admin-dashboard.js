document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth; if(!auth)return;
  const session=await auth.getSession(); if(!session){location.href="login.html?return=admin.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff){location.href="account.html";return;}
  const welcome=document.getElementById("staff-welcome"), message=document.getElementById("staff-message"), signout=document.getElementById("staff-sign-out");
  if(welcome)welcome.textContent=`Signed in as ${session.user.email}`;
  if(signout)signout.addEventListener("click",async()=>{signout.disabled=true;try{await auth.signOut();}catch(e){signout.disabled=false;if(message){message.textContent=e?.message||"Could not sign out.";message.className="form-message error";}}});
});
