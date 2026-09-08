/*
 * Final inspection decision UI fix.
 *
 * Customer acceptance changes quote_items.item_status to "accepted". The base
 * admin quote renderer treats accepted items as closed, so this layer restores
 * final-offer controls only when the linked sale is in inspection AND the
 * linked physical inventory asset has completed the Purchasing inspection.
 *
 * Sales never edits the inspection record. Repair and inspection corrections
 * remain in Purchasing; Sales receives the completed inspection as read-only.
 */
(() => {
  "use strict";

  let inspectionItemIds = new Set();
  let loadedValuationId = "";
  let refreshTimer = null;
  let running = false;

  const getValuationId = () => new URLSearchParams(window.location.search).get("id") || "";

  async function loadInspectionItems() {
    const auth = window.actionBuyerAuth;
    const valuationId = getValuationId();
    if (!valuationId || !auth?.supabase) return;
    if (running) return;
    running = true;
    try {
      const { data: items, error: itemError } = await auth.supabase
        .from("quote_items")
        .select("id,item_status")
        .eq("valuation_id", valuationId);
      if (itemError) throw itemError;

      const acceptedIds = (items || [])
        .filter(item => item.item_status === "accepted")
        .map(item => item.id);

      if (!acceptedIds.length) {
        inspectionItemIds = new Set();
        loadedValuationId = valuationId;
        applyControls();
        return;
      }

      const { data: saleItems, error: saleItemError } = await auth.supabase
        .from("sale_items")
        .select("sale_id,quote_item_id")
        .in("quote_item_id", acceptedIds);
      if (saleItemError) throw saleItemError;
      if (!saleItems?.length) {
        inspectionItemIds = new Set();
        loadedValuationId = valuationId;
        applyControls();
        return;
      }

      const saleIds = [...new Set(saleItems.map(row => row.sale_id).filter(Boolean))];
      const { data: sales, error: salesError } = await auth.supabase
        .from("sales")
        .select("id,status")
        .in("id", saleIds);
      if (salesError) throw salesError;

      const inspectionSaleIds = new Set(
        (sales || [])
          .filter(sale => sale.status === "inspection")
          .map(sale => sale.id)
      );

      const inspectionPairs = saleItems.filter(row => inspectionSaleIds.has(row.sale_id));
      if (!inspectionPairs.length) {
        inspectionItemIds = new Set();
        loadedValuationId = valuationId;
        applyControls();
        return;
      }

      const { data: assets, error: assetError } = await auth.supabase
        .from("inventory_assets")
        .select("source_sale_id,source_quote_item_id,status")
        .in("source_sale_id", [...new Set(inspectionPairs.map(row => row.sale_id))]);
      if (assetError) throw assetError;

      const completedStatuses = new Set(["Ready for Resale", "Sent to Sales", "Listed", "Reserved", "Sold"]);
      const completedPairKeys = new Set(
        (assets || [])
          .filter(asset => completedStatuses.has(String(asset.status || "")))
          .map(asset => String(asset.source_sale_id) + ":" + String(asset.source_quote_item_id))
      );

      inspectionItemIds = new Set(
        inspectionPairs
          .filter(row => completedPairKeys.has(String(row.sale_id) + ":" + String(row.quote_item_id)))
          .map(row => row.quote_item_id)
      );
      loadedValuationId = valuationId;
      applyControls();
    } catch (error) {
      console.warn("Final inspection completion check failed", error);
    } finally {
      running = false;
    }
  }

  function applyControls() {
    const valuationId = getValuationId();
    if (!valuationId || valuationId !== loadedValuationId) return;

    document.querySelectorAll(".valuation-card").forEach(card => {
      const controls = card.querySelectorAll("[data-item]");
      const itemId = controls[0]?.dataset?.item;
      if (!itemId || !inspectionItemIds.has(itemId)) return;

      card.querySelectorAll(
        '.offer-price[data-type="final"], .publish-offer[data-type="final"], .refuse-item'
      ).forEach(control => {
        control.removeAttribute("disabled");
      });
    });
  }

  function watchDom() {
    const observer = new MutationObserver(() => {
      applyControls();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (!document.hidden) {
        void loadInspectionItems();
        applyControls();
      }
    }, 1000);
  }

  async function init() {
    await loadInspectionItems();
    applyControls();
    watchDom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { void init(); }, { once: true });
  } else {
    void init();
  }
})();
