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

    // A quote is awaiting staff review when it is in the normal review queue,
    // or when an automatic valuation has been prepared as a draft. Once an offer
    // has actually been published or accepted, that quote has left the valuation
    // queue and must not continue to be counted here.
    const awaitingStatuses = new Set(["submitted", "manual_review", "pending_review", "awaiting_valuation"]);
    const activeOfferStatuses = new Set(["draft", "published", "accepted"]);
    const itemsByValuation = new Map();
    items.forEach(i => {
      if (!itemsByValuation.has(i.valuation_id)) itemsByValuation.set(i.valuation_id, []);
      itemsByValuation.get(i.valuation_id).push(i);
    });
    const awaitingReviewCount = activeValuations.filter(v => {
      const valuationItems = itemsByValuation.get(v.id) || [];
      const hasActiveOffer = valuationItems.some(item =>
        offers.some(o => o.item_id === item.id && activeOfferStatuses.has(o.status))
      );

      // Published/accepted/draft offers mean the valuation is already being
      // handled as an offer rather than a new valuation awaiting review.
      if (hasActiveOffer) return false;

      if (awaitingStatuses.has(v.status)) return true;
      if (v.status !== "valued") return false;
      return valuationItems.some(item =>
        offers.some(o => o.item_id === item.id && o.offer_type === "automatic" && o.status === "draft")
      );
    }).length;
    document.getElementById("valuation-count").textContent = awaitingReviewCount;

    // Only active sales belong in the live dashboard queue. Archived sales remain
    // available in Sales Archive and must not be counted here. "shipping" means
    // the customer has posted the item and it is now awaiting delivery to us.
    const { data: sales, error: salesError } = await auth.supabase.from("sales").select("id,status,archived_at").is("archived_at", null);
    if (salesError) { notice("Could not load sales counts.", false); return; }
    const acceptedStatuses = new Set(["collecting_items", "ready_for_shipping", "shipping", "awaiting_delivery", "awaiting_inspection", "inspection", "final_valuation", "payment_processing", "paid"]);
    const accepted = (sales || []).filter(s => acceptedStatuses.has(s.status));
    document.getElementById("accepted-count").textContent = accepted.length;
    const deliveryStatuses = new Set(["collecting_items", "ready_for_shipping", "shipping", "awaiting_delivery"]);
    document.getElementById("delivery-count").textContent = accepted.filter(s => deliveryStatuses.has(s.status)).length;
    document.getElementById("paid-count").textContent = accepted.filter(s => s.status === "paid").length;

    const { data: customers, error: customerError } = await auth.supabase.rpc("staff_customer_list");
    if (customerError) { notice("Could not load customer count.", false); return; }
    document.getElementById("customer-count").textContent = (customers || []).length;
  }

  await loadCounts();
});
