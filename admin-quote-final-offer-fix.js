/*
 * Final inspection decision UI fix.
 *
 * A customer accepting the initial/manual offer changes quote_items.item_status
 * to "accepted". admin-quote.js treats accepted items as closed, which is
 * correct before inspection but not after the physical item has been received
 * and inspection has started.
 *
 * Only when the linked sale is actually in `inspection` do we re-enable the
 * two inspection-stage decisions: FINAL INSPECTION OFFER and REFUSE ITEM.
 * Earlier quote stages remain unchanged.
 */
(() => {
  "use strict";

  const run = async () => {
    const params = new URLSearchParams(window.location.search);
    const valuationId = params.get("id");
    const auth = window.actionBuyerAuth;
    if (!valuationId || !auth) return;

    try {
      const { data: items } = await auth.supabase
        .from("quote_items")
        .select("id,item_status")
        .eq("valuation_id", valuationId);

      const acceptedIds = new Set((items || [])
        .filter(item => item.item_status === "accepted")
        .map(item => item.id));
      if (!acceptedIds.size) return;

      const { data: saleItems } = await auth.supabase
        .from("sale_items")
        .select("sale_id,quote_item_id")
        .in("quote_item_id", [...acceptedIds]);
      if (!saleItems?.length) return;

      const saleIds = [...new Set(saleItems.map(row => row.sale_id).filter(Boolean))];
      const { data: sales } = await auth.supabase
        .from("sales")
        .select("id,status")
        .in("id", saleIds);
      const inspectionSaleIds = new Set((sales || [])
        .filter(sale => sale.status === "inspection")
        .map(sale => sale.id));
      if (!inspectionSaleIds.size) return;

      const inspectionItemIds = new Set(saleItems
        .filter(row => inspectionSaleIds.has(row.sale_id))
        .map(row => row.quote_item_id));

      document.querySelectorAll(".valuation-card").forEach(card => {
        const itemControls = card.querySelectorAll("[data-item]");
        const itemId = itemControls[0]?.dataset?.item;
        if (!itemId || !inspectionItemIds.has(itemId)) return;

        card.querySelectorAll('.offer-price[data-type="final"], .publish-offer[data-type="final"], .refuse-item')
          .forEach(control => control.removeAttribute("disabled"));
      });
    } catch (_) {
      // The base quote page remains authoritative if this enhancement cannot load.
    }
  };

  const start = () => { void run(); };
  document.addEventListener("DOMContentLoaded", start, { once: true });

  const observer = new MutationObserver(() => {
    const cards = document.querySelectorAll(".valuation-card [data-item]");
    if (cards.length) {
      observer.disconnect();
      void run();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
