/* GearCashOut admin display for server-generated automatic item offers. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("offer-controls");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;

  const params = new URLSearchParams(window.location.search);
  const valuationId = params.get("id");
  if (!valuationId) return;

  const money = value => new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(Number(value || 0));

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  let queued = false;

  async function applyAutomaticOffers() {
    const { data: items } = await auth.supabase
      .from("quote_items")
      .select("id,item_position,item_name")
      .eq("valuation_id", valuationId)
      .order("item_position", { ascending: true });

    if (!items?.length) return;

    const ids = items.map(item => item.id);
    const { data: offers } = await auth.supabase
      .from("quote_offers")
      .select("id,item_id,offer_type,amount,status,published_at,responded_at")
      .in("item_id", ids)
      .eq("offer_type", "automatic")
      .order("created_at", { ascending: false });

    const automaticByItem = new Map();
    (offers || []).forEach(offer => {
      if (!automaticByItem.has(offer.item_id)) automaticByItem.set(offer.item_id, offer);
    });

    box.querySelectorAll(".valuation-card").forEach(card => {
      const marker = card.querySelector("[data-item]");
      const itemId = marker?.dataset.item;
      if (!itemId) return;

      const automatic = automaticByItem.get(itemId);
      if (!automatic) return;
      if (card.dataset.automaticOfferId === automatic.id) return;

      const manualInput = card.querySelector(`.offer-price[data-item="${CSS.escape(itemId)}"][data-type="manual"]`);
      const manualRow = manualInput?.closest('div[style*="grid-template-columns"]');
      if (!manualRow) return;

      const status = String(automatic.status || "published").replaceAll("_", " ").toUpperCase();
      const responseText = automatic.responded_at
        ? `Responded ${new Date(automatic.responded_at).toLocaleString("en-GB")}`
        : "";

      const replacement = document.createElement("div");
      replacement.className = "automatic-offer-display";
      replacement.style.cssText = "display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;padding:.9rem 1rem;border-left:4px solid #d88732;background:#fff7eb;";
      replacement.innerHTML = `
        <div>
          <strong>AUTOMATIC OFFER</strong>
          <div><span class="status-badge">${esc(status)}</span>${responseText ? `<small style="margin-left:.5rem;">${esc(responseText)}</small>` : ""}</div>
          <small>Generated from the verified automatic pricing rule.</small>
        </div>
        <strong style="font-size:1.25rem;">${money(automatic.amount)}</strong>`;

      manualRow.replaceWith(replacement);
      card.dataset.automaticOfferId = automatic.id;
    });
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    window.setTimeout(async () => {
      queued = false;
      try { await applyAutomaticOffers(); } catch (error) { console.error("Automatic offer display failed", error); }
    }, 50);
  }

  const observer = new MutationObserver(queueApply);
  observer.observe(box, { childList: true, subtree: true });
  queueApply();
});
