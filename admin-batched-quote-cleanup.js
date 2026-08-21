/* Keeps the staff multi-item quote page focused on quote_items. The legacy single-item submission summary is not used when a batched quote has quote_items. */
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

    const title = document.getElementById("quote-title");
    if (title) title.textContent = `${items.length}-ITEM QUOTE`;

    const submissionBox = document.getElementById("quote-details");
    const submissionPanel = submissionBox?.closest(".account-panel");
    if (submissionPanel) submissionPanel.remove();
  });
})();
