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

  fixPurchaseNavigation();
  document.addEventListener("DOMContentLoaded", fixPurchaseNavigation);
  new MutationObserver(fixPurchaseNavigation).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
