// Keep the purchase workflow navigation names stable even if an older cached script rewrites them.
(function () {
  function fixPurchaseNavigation() {
    const nav = document.getElementById("sales-view-nav");
    if (!nav) return;
    const labels = [
      ["admin-sales.html", "ACTIVE PURCHASES"],
      ["admin-sales.html?archive=1", "PURCHASE ARCHIVE"],
      ["admin-sales.html?returned=1", "RETURNED ARCHIVE"]
    ];
    labels.forEach(([href, text]) => {
      const link = nav.querySelector(`a[href="${href}"]`);
      if (link && link.textContent !== text) link.textContent = text;
    });
  }

  function start() {
    const nav = document.getElementById("sales-view-nav");
    if (!nav) return;
    fixPurchaseNavigation();

    // Watch only the navigation that admin-sales.js replaces, rather than the
    // entire document. The previous whole-document observer ran on every DOM
    // change across the purchasing dashboard and added unnecessary load.
    new MutationObserver(fixPurchaseNavigation).observe(nav, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
