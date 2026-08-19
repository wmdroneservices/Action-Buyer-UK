/* GearCashOut result compatibility layer.
   DJI navigation is handled by quote.js itself so that its internal
   currentStep state stays synchronised. This file intentionally does not
   intercept DJI Step 3 navigation. */
(function () {
  "use strict";

  const form = document.getElementById("quote-form");
  if (!form) return;

  window.renderGearCashOutManualResult = function () {
    const step = form.querySelector('[data-step="12"]');
    const summary = document.getElementById("quote-summary");
    if (!step || !summary) return;

    const selectedText = function (select) {
      return select && select.options && select.selectedIndex >= 0
        ? select.options[select.selectedIndex].textContent.trim()
        : "";
    };

    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const model = document.getElementById("dji-model");
    if (!category || !manufacturer || !model) return;

    const categoryName = selectedText(category) || category.value;
    const manufacturerName = selectedText(manufacturer) || manufacturer.value;
    const modelName = selectedText(model) || model.value;

    step.querySelectorAll("#quote-important, #gear-basket-box, .quote-basket-box, #quote-result-action").forEach(function (el) {
      el.remove();
    });

    const title = document.getElementById("quote-result-title");
    if (title) title.textContent = "Manual Valuation Required";

    let basket = [];
    try {
      basket = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]");
    } catch (_) {
      basket = [];
    }
    if (!Array.isArray(basket)) basket = [];

    if (!basket.some(function (item) {
      return item.model === model.value && item.manufacturer === manufacturer.value;
    })) {
      basket.push({
        category: category.value,
        categoryName: categoryName,
        manufacturer: manufacturer.value,
        manufacturerName: manufacturerName,
        model: model.value,
        modelName: modelName,
        valuation: "manual",
        amount: null
      });
    }

    const rows = basket.map(function (item, index) {
      return "<li><strong>" + (index + 1) + ". " + String(item.modelName || item.model) + "</strong><br><span>" + String(item.manufacturerName || item.manufacturer) + " — Manual valuation</span></li>";
    }).join("");

    summary.innerHTML =
      '<div class="manual-valuation-box">' +
        '<p><strong>Equipment:</strong> ' + categoryName + '</p>' +
        '<p><strong>Manufacturer:</strong> ' + manufacturerName + '</p>' +
        '<p><strong>Model:</strong> ' + modelName + '</p>' +
        '<p>We do not currently have a verified automatic purchase price for this equipment. Your information and photographs will be reviewed manually before a purchase valuation is confirmed.</p>' +
        '<p><strong>No £0 offer has been made.</strong></p>' +
      '</div>' +
      '<div class="quote-basket-preview">' +
        '<h3>Your Quote</h3>' +
        '<p>You can add more equipment before submitting your quote.</p>' +
        '<ol>' + rows + '</ol>' +
        '<p><strong>Total:</strong> Manual valuation after review</p>' +
      '</div>' +
      '<div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">' +
        '<button type="button" class="btn" id="add-another-item">Add Another Item</button>' +
        '<button type="button" class="btn" id="continue-with-quote" data-quote-action="manual">Continue with This Quote</button>' +
      '</div>';
  };

  /* Mini package battery display fix.
     Fly More Combo packages contain 3 batteries; Standard/Drone-only
     packages contain 1. Keep the Step 6 wording and selector in sync with
     the package currently selected in Step 3. */
  function updateMiniBatteryDisplay() {
    const model = document.getElementById("dji-model");
    const packageSelect = document.getElementById("package-select");
    const step6 = form.querySelector('[data-step="6"]');
    if (!model || !packageSelect || !step6) return;

    const modelId = String(model.value || "").toLowerCase();
    const packageId = String(packageSelect.value || "").toLowerCase();
    const packageName = packageSelect.options && packageSelect.selectedIndex >= 0
      ? String(packageSelect.options[packageSelect.selectedIndex].textContent || "").toLowerCase()
      : "";

    const miniModels = ["mini-2", "mini-3", "mini-3-pro", "mini-4-pro", "mini-5-pro"];
    if (!miniModels.includes(modelId) || !packageId) return;

    const expected = packageName.includes("fly more") || packageId.includes("fly-more") ? 3 : 1;
    const intro = step6.querySelector(".gear-battery-intro");
    if (intro) {
      intro.innerHTML = `<strong>${expected} package batter${expected === 1 ? "y" : "ies"} expected from the selected package.</strong> Enter only the package batteries you are actually sending. If none are supplied, select 0. Extra batteries are entered separately in Step 10.`;
    }

    const notices = Array.from(step6.querySelectorAll("p")).filter(function (p) {
      return /selected package normally includes/i.test(p.textContent || "");
    });
    notices.forEach(function (notice) {
      notice.innerHTML = `The selected package normally includes <strong>${expected}</strong> battery${expected === 1 ? "" : "ies"}. Enter every battery you are sending. Any batteries beyond the package allowance are treated as additional batteries for valuation.`;
    });

    const count = document.getElementById("package-battery-count");
    if (count) {
      const current = Number(count.value);
      count.innerHTML = "";
      for (let i = 0; i <= expected; i++) {
        count.add(new Option(String(i), String(i)));
      }
      count.value = Number.isInteger(current) && current >= 0 && current <= expected
        ? String(current)
        : String(expected);
    }
  }

  updateMiniBatteryDisplay();
  form.addEventListener("change", function (event) {
    if (event.target && (event.target.id === "package-select" || event.target.id === "dji-model")) {
      window.setTimeout(updateMiniBatteryDisplay, 0);
    }
  });

  const batteryObserver = new MutationObserver(function () {
    updateMiniBatteryDisplay();
  });
  batteryObserver.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
})();
