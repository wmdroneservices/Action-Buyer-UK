/* Staff action prompts for each valuation card. */
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("manual-valuations");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  let timer = null;
  let loading = false;

  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(enhance, 100);
  };

  async function enhance() {
    if (loading) return;
    loading = true;
    try {
      const cards = [...box.querySelectorAll("article.admin-customer-quote")];
      if (!cards.length) return;

      const refs = cards.map(card => card.querySelector(".valuation-ref")?.textContent?.trim()).filter(Boolean);
      if (!refs.length) return;

      const { data: valuations, error } = await auth.supabase
        .from("valuations")
        .select("id,quote_reference,status")
        .in("quote_reference", refs);
      if (error || !valuations?.length) return;

      const ids = valuations.map(v => v.id);
      const { data: items } = await auth.supabase
        .from("quote_items")
        .select("id,valuation_id,item_status")
        .in("valuation_id", ids);
      const itemIds = (items || []).map(i => i.id);
      const { data: offers } = itemIds.length
        ? await auth.supabase
            .from("quote_offers")
            .select("id,item_id,status,responded_at")
            .in("item_id", itemIds)
        : { data: [] };

      const byRef = new Map(valuations.map(v => [v.quote_reference, v]));
      const itemsByValuation = new Map();
      (items || []).forEach(i => {
        if (!itemsByValuation.has(i.valuation_id)) itemsByValuation.set(i.valuation_id, []);
        itemsByValuation.get(i.valuation_id).push(i);
      });
      const offersByItem = new Map();
      (offers || []).forEach(o => {
        if (!offersByItem.has(o.item_id)) offersByItem.set(o.item_id, []);
        offersByItem.get(o.item_id).push(o);
      });

      cards.forEach(card => {
        if (card.querySelector(".quote-next-action")) return;
        const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
        const valuation = byRef.get(ref);
        if (!valuation) return;

        const valuationItems = itemsByValuation.get(valuation.id) || [];
        const refusedItems = valuationItems.filter(i => String(i.item_status || "").toLowerCase() === "refused");
        const actionableItems = valuationItems.filter(i => !["refused", "closed"].includes(String(i.item_status || "").toLowerCase()));

        const allOffers = actionableItems.flatMap(item => offersByItem.get(item.id) || []);
        const active = allOffers.filter(o => !["superseded", "withdrawn", "refused"].includes(String(o.status || "").toLowerCase()));
        const accepted = active.some(o => o.status === "accepted");
        const responded = active.some(o => o.responded_at);
        const pendingItems = actionableItems.filter(item => {
          const itemOffers = (offersByItem.get(item.id) || []).filter(o => !["superseded", "withdrawn", "refused"].includes(String(o.status || "").toLowerCase()));
          return itemOffers.length === 0;
        });
        const hasActionableItems = actionableItems.length > 0;

        let tone = "wait";
        let title = "NO ACTION REQUIRED";
        let text = "This quote has no outstanding action for you.";
        let href = `admin-quote.html?id=${encodeURIComponent(valuation.id)}`;
        let button = "OPEN QUOTE";

        if (!hasActionableItems && refusedItems.length) {
          tone = "wait";
          title = "ITEM REFUSED — NO ACTION REQUIRED";
          text = "All items in this quote have been refused. No further action is required unless the customer contacts you again.";
          button = "VIEW REFUSED QUOTE";
        } else if (accepted) {
          tone = "urgent";
          title = "CUSTOMER ACCEPTED OFFER";
          text = "This quote has been accepted — continue processing it in Sales & Shipping.";
          href = "admin-sales.html";
          button = "PROCESS ACCEPTED SALE";
        } else if (responded) {
          tone = "urgent";
          title = "CUSTOMER RESPONSE RECEIVED";
          text = "A customer response needs your attention on this quote.";
          button = "REVIEW CUSTOMER RESPONSE";
        } else if (pendingItems.length) {
          tone = "urgent";
          title = refusedItems.length ? "NEW ITEM ACTION REQUIRED" : "NEW QUOTE RECEIVED";
          text = refusedItems.length
            ? `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} still await${pendingItems.length === 1 ? "s" : ""} valuation. Review the remaining item${pendingItems.length === 1 ? "" : "s"} and make an offer.`
            : "Customer awaiting valuation — review the submission and make an offer.";
          button = "REVIEW & VALUE QUOTE";
        } else if (active.length) {
          tone = "wait";
          title = "OFFER SENT — AWAITING CUSTOMER";
          text = "Your offer has been sent. No action is required until the customer responds.";
          button = "OPEN QUOTE";
        } else {
          tone = "urgent";
          title = "ACTION REQUIRED";
          text = "Open this quote and check what is still required before it can be completed.";
        }

        const styles = tone === "urgent"
          ? "border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;"
          : "border-left:5px solid #d88732;background:#fffaf2;color:#68451f;";

        const el = document.createElement("div");
        el.className = "quote-next-action";
        el.style.cssText = `margin:.9rem 0 0;padding:12px 14px;border-radius:4px;${styles}`;
        el.innerHTML = `<strong style="display:block;font-size:.8rem;letter-spacing:.08em;">${esc(title)}</strong><span style="display:block;margin-top:.25rem;font-weight:600;">${esc(text)}</span><a class="btn ${tone === "urgent" ? "btn-primary" : "btn-secondary"}" href="${href}" style="margin-top:.6rem;">${esc(button)}</a>`;
        card.querySelector(".valuation-meta")?.prepend(el);
      });
    } finally {
      loading = false;
    }
  }

  const observer = new MutationObserver(schedule);
  observer.observe(box, { childList: true, subtree: true });
  setTimeout(enhance, 500);
});
