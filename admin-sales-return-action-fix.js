/*
 * Return-shipment guard.
 * A paid/completed sale does NOT automatically need a return shipment.
 * GearCashOut only needs a US -> customer return action when a customer has
 * actually refused an offer that requires the item to be returned.
 */
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  let running = false;
  let timer;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 250);
  };

  async function apply() {
    if (running) return;
    running = true;
    try {
      const cards = [...box.querySelectorAll("article.valuation-card")];
      const refs = cards.map(card => card.querySelector(".valuation-ref")?.textContent?.trim()).filter(Boolean);
      if (!refs.length) return;

      const { data: sales } = await auth.supabase
        .from("sales")
        .select("id,sale_reference,status")
        .in("sale_reference", refs);
      if (!sales?.length) return;

      const saleIds = sales.map(s => s.id);
      const { data: saleItems } = await auth.supabase
        .from("sale_items")
        .select("sale_id,quote_item_id")
        .in("sale_id", saleIds);
      const quoteItemIds = (saleItems || []).map(x => x.quote_item_id).filter(Boolean);

      const { data: refusedOffers } = quoteItemIds.length
        ? await auth.supabase
            .from("quote_offers")
            .select("id,item_id,status,offer_type,responded_at")
            .in("item_id", quoteItemIds)
            .eq("status", "refused")
        : { data: [] };

      const refusedBySale = new Set();
      (saleItems || []).forEach(si => {
        if ((refusedOffers || []).some(o => o.item_id === si.quote_item_id)) refusedBySale.add(si.sale_id);
      });

      const saleByRef = new Map(sales.map(s => [s.sale_reference, s]));

      cards.forEach(card => {
        const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
        const sale = saleByRef.get(ref);
        if (!sale) return;

        const hasRefusal = refusedBySale.has(sale.id);
        const status = String(sale.status || "");
        const returnButtons = [...card.querySelectorAll(".new-shipment[data-type='return']")];

        // No customer refusal means there is nothing to return.
        if (!hasRefusal) {
          returnButtons.forEach(button => {
            button.hidden = true;
            button.disabled = true;
          });
        } else {
          returnButtons.forEach(button => {
            button.hidden = false;
            button.disabled = false;
          });
        }

        const alert = card.querySelector(".sale-next-action");
        if (alert && status === "paid" && !hasRefusal) {
          alert.remove();
        }

        if (status === "paid" && hasRefusal && !alert) {
          const meta = card.querySelector(".valuation-meta");
          if (!meta) return;
          const el = document.createElement("div");
          el.className = "sale-next-action";
          el.style.cssText = "margin:.9rem 0;padding:12px 14px;border-radius:4px;border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;";
          el.innerHTML = '<strong style="display:block;font-size:.8rem;letter-spacing:.08em;">CUSTOMER REFUSED — ACTION REQUIRED</strong><span style="display:block;margin-top:.25rem;font-weight:600;">Arrange the GearCashOut → customer return shipment for the refused item.</span><a class="btn btn-primary" href="admin-sale.html?id=' + encodeURIComponent(sale.id) + '" style="margin-top:.6rem;">VIEW SALE &amp; ACTION</a>';
          meta.prepend(el);
        }

        if (["completed", "cancelled"].includes(status)) {
          const stale = card.querySelector(".sale-next-action");
          if (stale) stale.remove();
        }
      });
    } finally {
      running = false;
    }
  }

  new MutationObserver(schedule).observe(box, { childList: true, subtree: true });
  setTimeout(apply, 900);
});
