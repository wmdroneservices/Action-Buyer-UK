/* Adds a real drill-down link to every item in a staff multi-item quote. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const auth = window.actionBuyerAuth;
    const box = document.getElementById("offer-controls");
    const valuationId = new URLSearchParams(window.location.search).get("id");
    if (!auth || !box || !valuationId) return;
    const session = await auth.getSession();
    if (!session) return;

    let queued = false;
    async function addLinks() {
      const { data: items, error } = await auth.supabase
        .from("quote_items")
        .select("id,item_name,item_position")
        .eq("valuation_id", valuationId)
        .order("item_position", { ascending: true });
      if (error || !items?.length) return;

      const cards = [...box.querySelectorAll("article.valuation-card")];
      for (const item of items) {
        const card = cards.find(c => {
          const button = c.querySelector(`[data-item="${CSS.escape(item.id)}"]`);
          return !!button;
        });
        if (!card || card.querySelector(`.item-review-link[data-item-id="${CSS.escape(item.id)}"]`)) continue;

        const link = document.createElement("a");
        link.className = "btn btn-secondary item-review-link";
        link.dataset.itemId = item.id;
        link.href = `admin-item-review.html?item_id=${encodeURIComponent(item.id)}`;
        link.textContent = "VIEW ITEM & PHOTOS";
        link.style.cssText = "display:inline-block;margin-top:.65rem;";

        const heading = card.querySelector("h3");
        if (heading) heading.insertAdjacentElement("afterend", link);
        else card.prepend(link);
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      setTimeout(async () => {
        queued = false;
        try { await addLinks(); } catch (e) { console.error("Item review links failed", e); }
      }, 100);
    }

    new MutationObserver(queue).observe(box, { childList: true, subtree: true });
    queue();
  });
})();
