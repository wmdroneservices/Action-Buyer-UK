/* GearCashOut result compatibility layer.
   The basket is the source of truth for multi-item quotes. Automatic prices
   are shown only for items for which the core quote engine has produced a
   verified automatic offer; manual items never display £0.00. */
(function () {
  "use strict";

  const form = document.getElementById("quote-form");
  if (!form) return;

  function clean(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isPlaceholder(value) {
    const text = clean(value);
    return !text || /^[-–—]/.test(text) || (/\bselect\b/.test(text) && /\b(model|package|accessory|manufacturer)\b/.test(text));
  }

  function isCompleteItem(item) {
    if (!item || typeof item !== "object") return false;
    if (isPlaceholder(item.category) || isPlaceholder(item.categoryName)) return false;
    if (isPlaceholder(item.manufacturer) || isPlaceholder(item.manufacturerName)) return false;
    if (isPlaceholder(item.model) || isPlaceholder(item.modelName)) return false;
    if (item.category === "drone" && (isPlaceholder(item.package) || isPlaceholder(item.packageName))) return false;
    return true;
  }

  function readCleanBasket() {
    let basket = [];
    try {
      basket = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]");
    } catch (_) {
      basket = [];
    }
    if (!Array.isArray(basket)) basket = [];

    const valid = basket.filter(isCompleteItem);
    if (valid.length !== basket.length) {
      try { localStorage.setItem("gearCashOutQuoteBasket", JSON.stringify(valid)); } catch (_) {}
      window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged"));
    }
    return valid;
  }

  window.renderGearCashOutManualResult = function () {
    const step = form.querySelector('[data-step="12"]');
    const summary = document.getElementById("quote-summary");
    if (!step || !summary) return;

    const esc = function (value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const money = function (value) {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP"
      }).format(Number(value));
    };

    step.querySelectorAll("#quote-important, #gear-basket-box, .quote-basket-box, #quote-result-action").forEach(function (el) {
      el.remove();
    });

    const title = document.getElementById("quote-result-title");
    if (title) title.textContent = "Your Quote";

    const basket = readCleanBasket();

    if (!basket.length) {
      summary.innerHTML =
        '<div class="manual-valuation-box">' +
          '<h3>No items in this quote</h3>' +
          '<p>Please add at least one item before continuing.</p>' +
        '</div>';
      return;
    }

    const automaticCount = basket.filter(function (item) {
      return item.valuation === "automatic" && Number.isFinite(Number(item.amount));
    }).length;

    const rows = basket.map(function (item, index) {
      const name = item.modelName || item.itemName || item.categoryName || "Equipment item";
      const maker = item.manufacturerName || item.manufacturer || "";
      const packageName = item.packageName || "";
      const automatic = item.valuation === "automatic" && Number.isFinite(Number(item.amount));
      const valueHtml = automatic
        ? '<div style="font-weight:800;font-size:1.25rem;margin-top:.35rem;">' + money(item.amount) + '</div>'
        : '<div style="font-weight:700;margin-top:.35rem;">Manual valuation — price confirmed after review</div>';

      return '<li style="margin-bottom:1rem;">' +
        '<div><strong>' + (index + 1) + '. ' + esc(name) + '</strong></div>' +
        '<div>' + esc(maker) + (packageName ? ' — ' + esc(packageName) : '') + '</div>' +
        valueHtml +
        '<button type="button" class="btn btn-secondary" data-remove-quote-item="' + index + '" style="margin-top:.6rem;">Remove this item</button>' +
      '</li>';
    }).join("");

    let automaticTotal = 0;
    basket.forEach(function (item) {
      if (item.valuation === "automatic" && Number.isFinite(Number(item.amount))) {
        automaticTotal += Number(item.amount);
      }
    });

    const totalHtml = automaticCount
      ? '<p style="margin-top:1rem;"><strong>Automatic offer total:</strong> ' + money(automaticTotal) + '</p>' +
        '<p>Any item marked for manual valuation will be priced separately after review.</p>'
      : '<p style="margin-top:1rem;"><strong>No automatic price has been offered.</strong> Your item(s) will receive a valuation after manual review.</p>';

    summary.innerHTML =
      '<div class="quote-basket-preview">' +
        '<h3>This Quote</h3>' +
        '<p>Check your items carefully before submitting. If you added something by mistake, use <strong>Remove this item</strong>.</p>' +
        '<ol>' + rows + '</ol>' +
        totalHtml +
      '</div>' +
      '<div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">' +
        '<button type="button" class="btn btn-secondary" id="add-another-item">Add Another Item</button>' +
        '<button type="button" class="btn btn-primary" id="continue-with-quote" data-quote-action="manual">Continue with This Quote</button>' +
      '</div>';
  };
})();
