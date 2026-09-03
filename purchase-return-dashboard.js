document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth;
  const countEl=document.getElementById("purchase-return-count");
  if(!auth||!countEl)return;
  const session=await auth.getSession();
  if(!session)return;
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff)return;

  const load=async()=>{
    const {data:items,error}=await auth.supabase.from("quote_items").select("id").eq("item_status","refused");
    if(error)return;
    const ids=(items||[]).map(x=>x.id);
    let closed=new Set();
    if(ids.length){
      const {data:cases}=await auth.supabase.from("purchase_return_cases").select("quote_item_id,status").in("quote_item_id",ids);
      (cases||[]).filter(c=>c.status==="closed").forEach(c=>closed.add(c.quote_item_id));
    }
    const n=ids.filter(id=>!closed.has(id)).length;
    countEl.textContent=n;
    const card=document.querySelector('[data-count-for="purchase-return-count"]');
    if(card){card.classList.toggle("has-action",n>0);card.classList.toggle("is-clear",n===0);}
  };
  await load();
});