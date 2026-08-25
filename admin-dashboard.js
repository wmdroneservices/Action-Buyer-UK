document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { window.location.href = "account.html"; return; }

  const message = document.getElementById("staff-message");
  const notice = (text, ok = true) => { if (message) { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); } };
  document.getElementById("staff-welcome").textContent = `Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click", async () => { const b=document.getElementById("staff-sign-out"); b.disabled=true; try { await auth.signOut(); } catch(e) { b.disabled=false; notice(e?.message||"Could not sign out.",false); } });

  async function loadCounts() {
    const { data: valuations, error: valuationError } = await auth.supabase
      .from("valuations")
      .select("id,status,archived_at")
      .is("archived_at", null);
    if (valuationError) { notice("Could not load work queue counts.", false); return; }

    const activeValuations = valuations || [];
    const valuationIds = activeValuations.map(v => v.id);
    let items = [];
    let offers = [];

    if (valuationIds.length) {
      const { data: itemRows, error: itemError } = await auth.supabase
        .from("quote_items")
        .select("id,valuation_id")
        .in("valuation_id", valuationIds);
      if (itemError) { notice("Could not load valuation items.", false); return; }
      items = itemRows || [];

      const itemIds = items.map(i => i.id);
      if (itemIds.length) {
        const { data: offerRows, error: offerError } = await auth.supabase
          .from("quote_offers")
          .select("id,item_id,offer_type,status")
          .in("item_id", itemIds);
        if (offerError) { notice("Could not load valuation offers.", false); return; }
        offers = offerRows || [];
      }
    }

    const awaitingStatuses = new Set(["submitted", "manual_review", "pending_review", "awaiting_valuation"]);
    const activeOfferStatuses = new Set(["draft", "published", "accepted"]);
    const itemsByValuation = new Map();
    items.forEach(i => {
      if (!itemsByValuation.has(i.valuation_id)) itemsByValuation.set(i.valuation_id, []);
      itemsByValuation.get(i.valuation_id).push(i);
    });
    const awaitingReviewCount = activeValuations.filter(v => {
      const valuationItems = itemsByValuation.get(v.id) || [];
      const hasActiveOffer = valuationItems.some(item => offers.some(o => o.item_id === item.id && activeOfferStatuses.has(o.status)));
      if (hasActiveOffer) return false;
      if (awaitingStatuses.has(v.status)) return true;
      if (v.status !== "valued") return false;
      return valuationItems.some(item => offers.some(o => o.item_id === item.id && o.offer_type === "automatic" && o.status === "draft"));
    }).length;
    document.getElementById("valuation-count").textContent = awaitingReviewCount;

    // Sales are stage-by-stage. Shipping is split into two distinct physical stages:
    // 1) the staff member still needs to create/send the customer -> GearCashOut label;
    // 2) the label exists and the customer is now expected to send the item.
    const { data: sales, error: salesError } = await auth.supabase
      .from("sales")
      .select("id,status,payment_status,archived_at,bank_details_confirmed_at")
      .is("archived_at", null);
    if (salesError) { notice("Could not load sales counts.", false); return; }
    const activeSales = sales || [];
    const activeSaleIds = activeSales.map(s => s.id);

    const { data: shipments, error: shipmentError } = activeSaleIds.length
      ? await auth.supabase
          .from("shipments")
          .select("sale_id,shipment_type,status,label_urls,shipped_at,delivered_at,created_at")
          .in("sale_id", activeSaleIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (shipmentError) { notice("Could not load shipping counts.", false); return; }

    const inboundBySale = new Map();
    (shipments || []).filter(s => s.shipment_type === "inbound").forEach(s => {
      if (!inboundBySale.has(s.sale_id)) inboundBySale.set(s.sale_id, s);
    });

    const awaitingCustomerResponse = offers.filter(o =>
      o.status === "published" && ["automatic", "manual"].includes(o.offer_type)
    ).length;
    document.getElementById("customer-response-count").textContent = awaitingCustomerResponse;

    const terminalStatuses = new Set(["paid", "completed", "cancelled"]);
    const shippingLabelRequired = activeSales.filter(s => {
      if (terminalStatuses.has(String(s.status || ""))) return false;
      if (!s.bank_details_confirmed_at) return false;
      return !inboundBySale.has(s.id);
    }).length;
    document.getElementById("shipping-label-count").textContent = shippingLabelRequired;

    const awaitingDeliveryCount = activeSales.filter(s => {
      if (terminalStatuses.has(String(s.status || ""))) return false;
      const inbound = inboundBySale.get(s.id);
      if (!inbound) return false;
      if (inbound.delivered_at || inbound.status === "delivered") return false;
      return true;
    }).length;
    document.getElementById("delivery-count").textContent = awaitingDeliveryCount;

    const inspectionCount = activeSales.filter(s => s.status === "received").length;
    document.getElementById("inspection-count").textContent = inspectionCount;

    const finalOfferStage = activeSales.filter(s => s.status === "inspection").length;
    document.getElementById("final-offer-count").textContent = finalOfferStage;

    const paymentDueCount = activeSales.filter(s => s.status === "payment_due").length;
    document.getElementById("payment-due-count").textContent = paymentDueCount;

    const paymentProcessingCount = activeSales.filter(s => s.payment_status === "payment_processing").length;
    document.getElementById("payment-processing-count").textContent = paymentProcessingCount;

    const paidCount = activeSales.filter(s =>
      s.status === "completed" || s.status === "paid" || s.payment_status === "paid"
    ).length;
    document.getElementById("paid-count").textContent = paidCount;

    const { data: customers, error: customerError } = await auth.supabase.rpc("staff_customer_list");
    if (customerError) { notice("Could not load customer count.", false); return; }
    document.getElementById("customer-count").textContent = (customers || []).length;
  }

  await loadCounts();

  setInterval(() => {
    if (!document.hidden) loadCounts();
  }, 5000);
});
