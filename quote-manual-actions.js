/* GearCashOut manual Step 12 actions. Keeps the manual valuation route working after the result compatibility layer replaces the legacy action button. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;
      const step = button.closest('.wizard-step[data-step="12"]');
      if (!step) return;

      if (button.id === "continue-with-quote") {
        event.preventDefault();
        event.stopImmediatePropagation();
        try { sessionStorage.setItem("actionBuyerManualValuation", "true"); } catch (_) {}
        if (typeof window.showStep === "function") window.showStep(13);
        return;
      }

      if (button.id === "add-another-item") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const basket = (() => {
          try { return JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]"); } catch (_) { return []; }
        })();
        try { localStorage.setItem("gearCashOutQuoteBasket", JSON.stringify(Array.isArray(basket) ? basket : [])); } catch (_) {}
        const formElement = document.getElementById("quote-form");
        if (formElement) formElement.reset();
        formElement.querySelectorAll('input[type="file"]').forEach(function (input) { try { input.value = ""; } catch (_) {} });
        const category = document.getElementById("gear-category");
        const manufacturer = document.getElementById("gear-manufacturer");
        const model = document.getElementById("dji-model");
        const pack = document.getElementById("package-select");
        if (category) category.value = "";
        if (manufacturer) { manufacturer.value = ""; manufacturer.disabled = true; }
        if (model) model.innerHTML = '<option value="">-- Select a model --</option>';
        if (pack) pack.innerHTML = '<option value="">-- Select a package --</option>';
        if (typeof window.showStep === "function") window.showStep(1);
      }
    }, true);
  });
})();
