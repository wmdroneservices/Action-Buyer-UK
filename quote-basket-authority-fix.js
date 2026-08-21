/* Final authority for the live quote basket.
   No script may persist an incomplete wizard row as a quote item. */
(function () {
  "use strict";

  const KEY = "gearCashOutQuoteBasket";

  function text(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function placeholder(value) {
    const s = text(value);
    return !s || /^[-–—]/.test(s) || (/\bselect\b/.test(s) && /\b(model|package|accessory|manufacturer)\b/.test(s));
  }

  function valid(item) {
    if (!item || typeof item !== "object") return false;
    if (placeholder(item.category) || placeholder(item.categoryName)) return false;
    if (placeholder(item.manufacturer) || placeholder(item.manufacturerName)) return false;
    if (placeholder(item.model) || placeholder(item.modelName)) return false;
    if (text(item.category) === "drone" && (placeholder(item.package) || placeholder(item.packageName))) return false;
    return true;
  }

  function cleanBasket() {
    let raw;
    try { raw = localStorage.getItem(KEY); } catch (_) { return []; }
    let basket;
    try { basket = raw ? JSON.parse(raw) : []; } catch (_) { basket = []; }
    if (!Array.isArray(basket)) basket = [];
    const clean = basket.filter(valid);
    if (clean.length !== basket.length) {
      try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch (_) {}
    }
    return clean;
  }

  /* Block the source of the bug: any later script trying to save a blank
     second item is cleaned before it reaches localStorage. */
  try {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      if (key === KEY) {
        try {
          const parsed = JSON.parse(value || "[]");
          const clean = Array.isArray(parsed) ? parsed.filter(valid) : [];
          return originalSetItem(key, JSON.stringify(clean));
        } catch (_) {
          return originalSetItem(key, "[]");
        }
      }
      return originalSetItem(key, value);
    };
  } catch (_) {}

  function refresh() {
    const before = cleanBasket();
    window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged"));
    if (typeof window.renderGearCashOutManualResult === "function") {
      window.renderGearCashOutManualResult();
    }
    return before.length;
  }

  document.addEventListener("DOMContentLoaded", function () {
    refresh();
    window.setTimeout(refresh, 0);
    window.setTimeout(refresh, 250);
  });

  window.addEventListener("gearCashOutNewItem", function () {
    window.setTimeout(cleanBasket, 0);
  });

  window.addEventListener("gearCashOutBasketChanged", function () {
    window.setTimeout(cleanBasket, 0);
  });
})();
