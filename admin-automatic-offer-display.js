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
    if (itemCount > 1 || !offerId) return;
    try { await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: "offer_published" } }); } catch (_) {}
  }

  async function applyAutomaticOffers() {
    const { data: items } = await auth.supabase.from("quote_items").select("id,item_position,item_name").eq("valuation_id", valuationId).order("item_position", { ascending: true });
    if (!items?.length) return;

    const ids = items.map(i => i.id);
    const { data: offers } = await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,published_at,responded_at,created_at").in("item_id", ids).order("created_at", { ascending: false });
    const automaticByItem = new Map();
    (offers || []).forEach(o => {
      if (o.offer_type === "automatic" && !["superseded","withdrawn"].includes(o.status) && !automaticByItem.has(o.item_id)) automaticByItem.set(o.item_id, o);
    });

    box.querySelectorAll(".valuation-card").forEach(card => {
      const itemId = card.querySelector("[data-item]")?.dataset.item;
      const automatic = automaticByItem.get(itemId);
      if (!itemId || !automatic || card.dataset.automaticOfferId === automatic.id) return;
      const manualInput = card.querySelector(`.offer-price[data-item="${CSS.escape(itemId)}"][data-type="manual"]`);
      const manualRow = manualInput?.closest('div[style*="grid-template-columns"]');
      if (!manualRow) return;

      const isDraft = automatic.status === "draft";
      const replacement = document.createElement("div");
      replacement.className = "automatic-offer-display";
      replacement.style.cssText = "padding:1rem;border-left:4px solid #d88732;background:#fff7eb;margin-top:.5rem;";
      replacement.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;">
          <div><strong>AUTOMATIC VALUATION</strong><div><span class="status-badge">${isDraft ? "NOT SENT" : esc(String(automatic.status || "published").toUpperCase())}</span></div><small>${isDraft ? "Prepared automatically. Review the submitted evidence before sending." : "This offer has been sent to the customer."}</small></div>
          <strong style="font-size:1.25rem;">${money(automatic.amount)}</strong>
        </div>
        ${isDraft ? `<div style="display:grid;grid-template-columns:minmax(150px,1fr) auto auto;gap:.5rem;align-items:end;margin-top:1rem;"><div><label style="display:block;font-weight:600;margin-bottom:.25rem;">Revised offer</label><input class="automatic-revised-price" data-item="${esc(itemId)}" type="number" min="0" step="0.01" value="${Number(automatic.amount).toFixed(2)}"></div><button class="btn btn-primary confirm-automatic-offer" data-item="${esc(itemId)}" type="button">CONFIRM &amp; SEND</button><button class="btn btn-secondary revise-automatic-offer" data-item="${esc(itemId)}" type="button">REVISE &amp; SEND</button></div>` : ""}`;
      manualRow.replaceWith(replacement);
      card.dataset.automaticOfferId = automatic.id;
    });

    const currentByItem = new Map();
    (offers || []).forEach(o => { if (!['superseded','withdrawn'].includes(o.status) && o.published_at && !currentByItem.has(o.item_id)) currentByItem.set(o.item_id, o); });
    const preparedByItem = new Map();
    (offers || []).forEach(o => { if (!['superseded','withdrawn'].includes(o.status) && o.status === 'draft' && o.offer_type === 'automatic' && !preparedByItem.has(o.item_id)) preparedByItem.set(o.item_id, o); });
    const total = items.reduce((sum, item) => { const o = currentByItem.get(item.id) || preparedByItem.get(item.id); return sum + (o && Number.isFinite(Number(o.amount)) ? Number(o.amount) : 0); }, 0);
    const sent = items.every(i => currentByItem.has(i.id) || !preparedByItem.has(i.id));
    const label = sent ? (items.length === 1 ? "Quote amount" : "Current combined offer total") : (items.length === 1 ? "Prepared automatic valuation" : "Prepared automatic total");
    const summary = box.querySelector("#resilient-quote-total, .quote-basket-total");
    if (summary) { const s = summary.querySelectorAll("strong"); if (s.length >= 2) { s[0].textContent = label; s[1].textContent = money(total); } }
    else { const s = document.createElement("div"); s.id = "sent-quote-total"; s.className = "quote-basket-total"; s.style.cssText = "display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;margin:0 0 1rem;font-size:1.2rem"; s.innerHTML = `<strong>${label}</strong><strong>${money(total)}</strong>`; box.prepend(s); }

    box.querySelectorAll(".confirm-automatic-offer,.revise-automatic-offer").forEach(button => {
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        const itemId = button.dataset.item;
        const automatic = automaticByItem.get(itemId);
        if (!automatic) return;
        const input = box.querySelector(`.automatic-revised-price[data-item="${CSS.escape(itemId)}"]`);
        const revised = Number(input?.value);
        const confirming = button.classList.contains("confirm-automatic-offer");
        const amount = confirming ? Number(automatic.amount) : revised;
        if (!Number.isFinite(amount) || amount < 0) { alert("Enter a valid offer amount."); return; }
        if (!confirm(confirming ? `Confirm and send the automatic offer of ${money(amount)} to the customer?` : `Send the revised offer of ${money(amount)} to the customer?`)) return;
        button.disabled = true;
        const { data: offer, error } = await auth.supabase.rpc("publish_quote_offer", { p_item_id:itemId, p_offer_type:confirming ? "automatic" : "manual", p_amount:amount, p_internal_notes:confirming ? "Confirmed automatic valuation after staff review" : "Revised offer after staff review", p_customer_message:"We have reviewed your submission and made an offer. Please sign in to your GearCashOut account to accept or refuse it." });
        if (error) { button.disabled = false; alert(error.message || "The offer could not be sent."); return; }
        await sendPublishedOffer(offer?.id, items.length);
        location.reload();
      });
    });
  }

  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => applyAutomaticOffers().catch(console.error), 50); };
  const observer = new MutationObserver(schedule);
  observer.observe(box, { childList:true, subtree:true });
  schedule();
});
