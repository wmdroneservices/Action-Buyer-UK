/*
 * Final inspection offer UI fix.
 *
 * A customer accepting the initial/manual offer changes quote_items.item_status
 * to "accepted". admin-quote.js currently treats "accepted" as fully closed,
 * which also disables the final inspection offer controls. The final inspection
 * offer is the next required staff action, so re-enable only the final-offer
 * controls for accepted items.
 */
(() => {
  "use strict";

  const enableFinalOfferForAcceptedItems = () => {
    document.querySelectorAll(".valuation-card").forEach(card => {
      const status = card.querySelector("p strong")?.parentElement?.textContent || "";
      if (!/Item status:\s*Accepted/i.test(status)) return;

      card.querySelectorAll('.offer-price[data-type="final"], .publish-offer[data-type="final"]').forEach(control => {
        control.removeAttribute("disabled");
      });
    });
  };

  document.addEventListener("DOMContentLoaded", enableFinalOfferForAcceptedItems);

  const observer = new MutationObserver(enableFinalOfferForAcceptedItems);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
