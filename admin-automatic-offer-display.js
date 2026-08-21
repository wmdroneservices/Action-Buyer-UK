/* Staff-side automatic valuation review controls.
   The automatic valuation is a DRAFT until staff explicitly confirm it or
   revise it. This renderer does not depend on the legacy manual-offer row. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("offer-controls");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;

  const valuationId = new URLSearchParams(window.location.search).get("id");
  if (!valuationId) return;

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  async function sendPublishedOffer(offerId, itemCount) {
    if (!offerId || itemCount !== 1) return;
    try { await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: "offer_published" } }); } catch (_) {}
  }

  async function loadControls() {
    const { data: items, error: itemError } = await auth.supabase
      .from("quote_items")
      .select("id,item_position,item_name,manufacturer,model,package,item_status")
      .eq("valuation_id", valuationId)
      .order("item_position", { ascending: true });
    if (itemError || !items?.length) return;

    const ids = items.map(item => item.id);
    const { data: offers } = await auth.supabase
      .from("quote_offers")
      .select("id,item_id,offer_type,amount,status,published_at,responded_at,created_at,updated_at")
      .in("item_id", ids)
      .order("created_at", { ascending: false });

    const automaticByItem = new Map();
    (offers || []).forEach(offer => {
      if (offer.offer_type === "automatic" && !["superseded", "withdrawn"].includes(offer.status) && !automaticByItem.has(offer.item_id)) {
        automaticByItem.set(offer.item_id, offer);
      }
    });

    box.querySelectorAll(".valuation-card").forEach(card => {
      if (card.querySelector(".automatic-review-panel")) return;
      const marker = card.querySelector("[data-item]");
      const itemId = marker?.dataset.item;
      if (!itemId) return;

      const automatic = automaticByItem.get(itemId);
      if (!automatic) return;

      const isDraft = automatic.status === "draft";
      const panel = document.createElement("div");
      panel.className = "automatic-review-panel";
      panel.style.cssText = "margin:1rem 0;padding:1rem;border-left:5px solid #d88732;background:#fff7eb;border-radius:6px;";
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <strong style="font-size:1.05rem;">AUTOMATIC VALUATION</strong>
            <div style="margin-top:.25rem;"><span class="status-badge">${isDraft ? "READY FOR STAFF REVIEW" : esc(String(automatic.status || "published").toUpperCase())}</span></div>
            <p style="margin:.5rem 0 0;">The system has calculated an automatic valuation. Review the submitted evidence before sending it to the customer.</p>
          </div>
          <strong style="font-size:1.4rem;">${money(automatic.amount)}</strong>
        </div>
        ${isDraft ? `
          <div style="display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:.6rem;align-items:end;margin-top:1rem;">
            <div>
              <label style="display:block;font-weight:700;margin-bottom:.25rem;" for="automatic-revised-${esc(itemId)}">Offer amount</label>
              <input id="automatic-revised-${esc(itemId)}" class="automatic-revised-price" data-item="${esc(itemId)}" type="number" min="0" step="0.01" value="${Number(automatic.amount).toFixed(2)}">
            </div>
            <button class="btn btn-primary confirm-automatic-offer" data-item="${esc(itemId)}" type="button">CONFIRM &amp; SEND ${money(automatic.amount)}</button>
            <button class="btn btn-secondary revise-automatic-offer" data-item="${esc(itemId)}" type="button">REVISE &amp; SEND</button>
          </div>
          <small style="display:block;margin-top:.6rem;">Confirm sends the calculated automatic amount. Revise &amp; Send lets staff offer a lower or higher amount after review.</small>` : `
          <p style="margin:.75rem 0 0;"><strong>This automatic offer has already been published.</strong></p>`;

      const heading = card.querySelector("h3");
      if (heading) heading.insertAdjacentElement("afterend", panel);
      else card.prepend(panel);

      panel.querySelector(".confirm-automatic-offer")?.addEventListener("click", () => publish(itemId, automatic, true, panel));
      panel.querySelector(".revise-automatic-offer")?.addEventListener("click", () => publish(itemId, automatic, false, panel));
    });
  }

  async function publish(itemId, automatic, confirming, panel) {
    const input = panel.querySelector(`.automatic-revised-price[data-item="${CSS.escape(itemId)}"]`);
    const revised = Number(input?.value);
    const amount = confirming ? Number(automatic.amount) : revised;
    if (!Number.isFinite(amount) || amount < 0) { alert("Enter a valid offer amount."); return; }

    const message = confirming
      ? `Confirm and send the automatic valuation of ${money(amount)} to the customer?`
      : `Send the revised offer of ${money(amount)} to the customer?`;
    if (!confirm(message)) return;

    const buttons = panel.querySelectorAll("button");
    buttons.forEach(button => { button.disabled = true; });

    const { data: offer, error } = await auth.supabase.rpc("publish_quote_offer", {
      p_item_id: itemId,
      p_offer_type: confirming ? "automatic" : "manual",
      p_amount: amount,
      p_internal_notes: confirming ? "Confirmed automatic valuation after staff review" : "Revised offer after staff review",
      p_customer_message: "We have reviewed your submission and made an offer. Please sign in to your GearCashOut account to accept or refuse it."
    });

    if (error) {
      buttons.forEach(button => { button.disabled = false; });
      alert(error.message || "The offer could not be sent.");
      return;
    }

    await sendPublishedOffer(offer?.id, 1);
    location.reload();
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadControls().catch(console.error), 80);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(box, { childList: true, subtree: true });
  schedule();
});
