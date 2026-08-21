/* Multi-item quote cleanup: batched reviews must use quote_items, not the legacy single-item submission summary. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const auth = window.actionBuyerAuth;
    const valuationId = new URLSearchParams(window.location.search).get("id");
    if (!auth || !valuationId) return;

    const session = await auth.getSession();
    if (!session) return;

    const { data: items, error } = await auth.supabase
      .from("quote_items")
      .select("id,item_position")
      .eq("valuation_id", valuationId)
      .order("item_position", { ascending: true });

    if (error || !items?.length) return;

    /* Remove the entire legacy Equipment & photographs panel for batched quotes.
       It reads valuations.quote_data and can therefore show stale single-item
       data such as Select a DJI model, Battery 1 / 0 cycles and old photos.
       The individual VIEW ITEM & PHOTOS pages are the authoritative review UI. */
    const submissionBox = document.getElementById("quote-details");
    const submissionPanel = submissionBox?.closest(".account-panel");
    if (submissionPanel) submissionPanel.remove();

    const title = document.getElementById("quote-title");
    if (title) title.textContent = `${items.length}-ITEM QUOTE`;
  });
})();
