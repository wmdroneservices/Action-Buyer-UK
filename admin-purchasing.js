document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin-purchasing.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { window.location.href = "account.html"; return; }

  const message = document.getElementById("staff-message");
  const notice = (text, ok = true) => { if (message) { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); } };
  document.getElementById("staff-welcome").textContent = `Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click", async () => { const b=document.getElementById("staff-sign-out"); b.disabled=true; try { await auth.signOut(); } catch(e) { b.disabled=false; notice(e?.message||"Could not sign out.",false); } });

  async function loadCounts() {
    const { data: valuations, error } = await auth.supabase.from("valuations").select("id,status,archived_at").is("archived_at", null);
    if (error) { notice("Could not load purchasing counts.", false); return; }
    const active = valuations || [], ids = active.map(v=>v.id);
    let items=[], offers=[];
    if(ids.length){
      const a=await auth.supabase.from("quote_items").select("id,valuation_id").in("valuation_id",ids); if(a.error){notice("Could not load valuation items.",false);return;} items=a.data||[];
      const itemIds=items.map(i=>i.id); if(itemIds.length){const b=await auth.supabase.from("quote_offers").select("id,item_id,offer_type,status").in("item_id",itemIds);if(b.error){notice("Could not load offers",false);return;}offers=b.data||[];}
    }
    const awaiting=new Set(["submitted","manual_review","pending_review","awaiting_valuation"]), activeOffers=new Set(["draft","published","accepted"]);
    const awaitingReview=active.filter(v=>{
      const vi=items.filter(i=>i.valuation_id===v.id);
      if(vi.some(i=>offers.some(o=>o.item_id===i.id&&activeOffers.has(o.status)))) return false;
      if(awaiting.has(v.status)) return true;
      return v.status==="valued" && vi.some(i=>offers.some(o=>o.item_id===i.id&&o.offer_type==="automatic"&&o.status==="draft"));
    }).length;
    document.getElementById("valuation-count").textContent=awaitingReview;

    const {data:sales,error:se}=await auth.supabase.from("sales").select("id,status,payment_status,archived_at,bank_details_confirmed_at").is("archived_at",null);
    if(se){notice("Could not load purchase pipeline counts.",false);return;}
    const activeSales=sales||[], saleIds=activeSales.map(s=>s.id);
    const {data:shipments,error:she}=saleIds.length?await auth.supabase.from("shipments").select("sale_id,shipment_type,status,delivered_at,created_at").in("sale_id",saleIds).order("created_at",{ascending:false}):{data:[],error:null};
    if(she){notice("Could not load shipping counts.",false);return;}

    const inbound=new Map();
    (shipments||[]).filter(s=>s.shipment_type==="inbound").forEach(s=>{
      if(!inbound.has(s.sale_id)) inbound.set(s.sale_id,s);
    });

    document.getElementById("customer-response-count").textContent=offers.filter(o=>o.status==="published"&&["automatic","manual"].includes(o.offer_type)).length;
    const terminal=new Set(["paid","completed","cancelled"]);

    // An accepted offer creates an inbound shipment immediately with status awaiting_label.
    // That is a shipping-label task, not an awaiting-delivery task. Delivery starts only
    // after the label/shipment has actually been created and is label_created/in_transit.
    const shippingLabelRequired=activeSales.filter(s=>{
      if(terminal.has(String(s.status||""))) return false;
      const x=inbound.get(s.id);
      return !x || ["awaiting_label","label_required"].includes(String(x.status||""));
    });
    const awaitingDelivery=activeSales.filter(s=>{
      if(terminal.has(String(s.status||""))) return false;
      const x=inbound.get(s.id);
      return x && ["label_created","in_transit"].includes(String(x.status||"")) && !x.delivered_at;
    });

    document.getElementById("shipping-label-count").textContent=shippingLabelRequired.length;
    document.getElementById("delivery-count").textContent=awaitingDelivery.length;
    document.getElementById("inspection-count").textContent=activeSales.filter(s=>s.status==="received").length;
    document.getElementById("final-offer-count").textContent=activeSales.filter(s=>s.status==="inspection").length;
    document.getElementById("payment-due-count").textContent=activeSales.filter(s=>s.status==="payment_due").length;
    document.getElementById("payment-processing-count").textContent=activeSales.filter(s=>s.payment_status==="payment_processing").length;
    document.getElementById("paid-count").textContent=activeSales.filter(s=>s.status==="completed"||s.status==="paid"||s.payment_status==="paid").length;

    const shippingCta=document.getElementById("shipping-label-cta");
    if(shippingCta) shippingCta.hidden=shippingLabelRequired.length===0;
    const deliveryCta=document.getElementById("delivery-cta");
    if(deliveryCta) deliveryCta.hidden=awaitingDelivery.length===0;

    const {data:customers,error:ce}=await auth.supabase.rpc("staff_customer_list"); if(ce){notice("Could not load customer count.",false);return;} document.getElementById("customer-count").textContent=(customers||[]).length;
  }
  await loadCounts(); setInterval(()=>{if(!document.hidden)loadCounts();},5000);
});
