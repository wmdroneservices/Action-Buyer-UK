/* GearCashOut manual Step 12 actions. Keeps the manual valuation route working after the result compatibility layer replaces the legacy action button. */
(function () {
  "use strict";

  function goToStep(form, number) {
    if (typeof window.showStep === "function") {
      window.showStep(number);
      return;
    }
    form.querySelectorAll(".wizard-step").forEach(function (section) {
      section.hidden = Number(section.dataset.step) !== number;
    });
    const progress = document.getElementById("progress-indicator");
    if (progress) {
      progress.querySelectorAll(".progress-step").forEach(function (item, index) {
        const itemNumber = Number(item.dataset.step || item.textContent.split(".")[0]);
        item.classList.toggle("active", itemNumber === number);
        if (itemNumber === number) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
        event.stopPropagation();
        event.stopImmediatePropagation();
        try { sessionStorage.setItem("actionBuyerManualValuation", "true"); } catch (_) {}
        goToStep(form, 13);
        return;
      }

      if (button.id === "add-another-item") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const basket = (() => {
          try { return JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]"); } catch (_) { return []; }
        })();
        try { localStorage.setItem("gearCashOutQuoteBasket", JSON.stringify(Array.isArray(basket) ? basket : [])); } catch (_) {}
        form.reset();
        form.querySelectorAll('input[type="file"]').forEach(function (input) { try { input.value = ""; } catch (_) {} });
        const category = document.getElementById("gear-category");
        const manufacturer = document.getElementById("gear-manufacturer");
        const model = document.getElementById("dji-model");
        const pack = document.getElementById("package-select");
        if (category) category.value = "";
        if (manufacturer) { manufacturer.value = ""; manufacturer.disabled = true; }
        if (model) model.innerHTML = '<option value="">-- Select a model --</option>';
        if (pack) pack.innerHTML = '<option value="">-- Select a package --</option>';
        goToStep(form, 1);
      }
    }, true);
  });
})();
