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

  function setCount(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const count = Number(value) || 0;
    el.textContent = count;

    const card = document.querySelector('[data-count-for="' + id + '"]');
    if (card) {
      const singular = card.dataset.singular || "item";
      const plural = card.dataset.plural || singular + "s";
      const label = card.querySelector(".pipeline-count-label");
      if (label) label.textContent = count + " " + (count === 1 ? singular : plural);
      card.classList.toggle("has-action", count > 0);
      card.classList.toggle("is-clear", count === 0);
    }
  }

  async function loadCounts() {
    // valuation-count and customer-response-count are deliberately owned by
    // admin-purchasing-combined-status.js so a mixed automatic/manual submission
    // can never jump into the purchase pipeline before the combined quote is sent.
    const { data: sales, error: se } = await auth.supabase
      .from("sales")
      .select("id,status,payment_status,archived_at,bank_details_confirmed_at")
      .is("archived_at", null);
    if(se){notice("Could not load purchase pipeline counts.",false);return;}

    const activeSales=sales||[], saleIds=activeSales.map(s=>s.id);
    const {data:shipments,error:she}=saleIds.length
      ? await auth.supabase.from("shipments").select("sale_id,shipment_type,status,delivered_at,created_at").in("sale_id",saleIds).order("created_at",{ascending:false})
      : {data:[],error:null};
    if(she){notice("Could not load shipping counts.",false);return;}

    const inbound=new Map();
    (shipments||[]).filter(s=>s.shipment_type==="inbound").forEach(s=>{
      if(!inbound.has(s.sale_id)) inbound.set(s.sale_id,s);
    });

    const terminal=new Set(["paid","completed","cancelled"]);
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

    setCount("shipping-label-count", shippingLabelRequired.length);
    setCount("delivery-count", awaitingDelivery.length);
    setCount("inspection-count", activeSales.filter(s=>s.status==="received").length);
    setCount("final-offer-count", activeSales.filter(s=>s.status==="inspection").length);
    setCount("payment-due-count", activeSales.filter(s=>s.status==="payment_due").length);
    setCount("payment-processing-count", activeSales.filter(s=>s.payment_status==="payment_processing").length);
    setCount("paid-count", activeSales.filter(s=>s.status==="completed"||s.status==="paid"||s.payment_status==="paid").length);

    const shippingCta=document.getElementById("shipping-label-cta");
    if(shippingCta) shippingCta.hidden=shippingLabelRequired.length===0;
    const deliveryCta=document.getElementById("delivery-cta");
    if(deliveryCta) deliveryCta.hidden=awaitingDelivery.length===0;

    const {data:customers,error:ce}=await auth.supabase.rpc("staff_customer_list");
    if(ce){notice("Could not load customer count.",false);return;}
    const customerCount=document.getElementById("customer-count");
    if(customerCount) customerCount.textContent=(customers||[]).length;
  }

  await loadCounts();
  setInterval(()=>{if(!document.hidden)loadCounts();},5000);
});
