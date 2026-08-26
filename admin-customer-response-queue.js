/* GearCashOut: customer-response queue for quotes already sent but not yet accepted. */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("customer-response-queue");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function load(){
    const { data: vals, error } = await auth.supabase
      .from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data,user_id")
      .eq("status","customer_review")
      .is("archived_at",null)
      .order("submitted_at",{ascending:false});
    if(error){box.innerHTML="";return;}

    const valuations=vals||[];
    if(!valuations.length){box.innerHTML="";return;}

    const ids=valuations.map(v=>v.id);
    const {data:items}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids)
      .order("item_position",{ascending:true});
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,created_at")
      .in("item_id",itemIds)
      .in("status",["published","accepted","refused"])
      .order("created_at",{ascending:false}):{data:[]};
    const offerList=offers||[];

    const groups=new Map();
    valuations.forEach(v=>{
      const key=v.quote_data?.submissionKey||v.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    });

    const cards=[...groups.values()].map(group=>{
      const groupIds=new Set(group.map(v=>v.id));
      const groupItems=itemList.filter(i=>groupIds.has(i.valuation_id));
      const effective=item=>{
        const list=offerList.filter(o=>o.item_id===item.id);
        return list.find(o=>o.status==='accepted')||list.find(o=>o.status==='published')||null;
      };
      const accepted=groupItems.filter(i=>i.item_status==='accepted');
      const refused=groupItems.filter(i=>i.item_status==='refused');
      const pending=groupItems.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      const total=groupItems.reduce((sum,item)=>sum+(Number(effective(item)?.amount)||0),0);
      const acceptedTotal=accepted.reduce((sum,item)=>sum+(Number(effective(item)?.amount)||0),0);
      const customer=group[0]?.quote_data?.fullName||group[0]?.quote_data?.customerName||"Customer";
      const reference=group[0]?.quote_reference||"Combined quote";
      return `<article class="valuation-card" style="margin-bottom:1rem;border-left:5px solid #d88732;display:grid;gap:.9rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
          <div><p class="section-kicker">CUSTOMER RESPONSE</p><span class="valuation-ref">${esc(reference)}</span><h3>${esc(customer)}</h3><p style="margin:.2rem 0">${groupItems.length} item${groupItems.length===1?"":"s"} · ${pending.length} awaiting response</p></div>
          <span class="status-badge">${pending.length ? "AWAITING CUSTOMER" : "RESPONSE COMPLETE"}</span>
        </div>
        <div style="display:grid;gap:.4rem">${groupItems.map(item=>{const o=effective(item);const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||item.item_name||"Equipment";return `<div style="display:flex;justify-content:space-between;gap:1rem;padding:.55rem .7rem;background:#f6f4ef"><span>${esc(title)}</span><strong>${o?money(o.amount):"—"}</strong></div>`;}).join("")}</div>
        <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-top:2px solid #102f4f;padding-top:.75rem"><strong>Combined quoted total</strong><strong>${money(total)}</strong></div>
        ${accepted.length?`<small>Currently accepted: ${money(acceptedTotal)}${refused.length?` · refused: ${refused.length}`:""}</small>`:""}
      </article>`;
    });

    box.innerHTML=cards.join("");
  }

  await load();
  setInterval(()=>{if(!document.hidden)load();},5000);
});
