/* Final authority for the two currently conflicting wizard controls. */
(function () {
  "use strict";

  function packageOptionsFor(category, manufacturer) {
    const cat = String(category || "").toLowerCase();
    const maker = String(manufacturer || "").toLowerCase();
    if (cat === "action-camera" && maker === "gopro") return [
      ["camera-only", "Camera Only"],
      ["standard-package", "Standard Package"],
      ["creator-package", "Creator Package / Accessory Bundle"]
    ];
    if (cat === "action-camera") return [
      ["camera-only", "Camera Only"],
      ["standard-package", "Standard Package"],
      ["combo", "Combo / Accessory Bundle"]
    ];
    if (cat === "camera") return [
      ["body-only", "Body Only"],
      ["standard-package", "Standard Package / Kit"],
      ["kit", "Kit / Lens Bundle"]
    ];
    if (cat === "lens") return [
      ["lens-only", "Lens Only"],
      ["with-case", "Lens + Case / Pouch"],
      ["complete", "Complete Package"]
    ];
    if (cat === "accessory") return [
      ["item-only", "Item Only"],
      ["with-original-packaging", "With Original Packaging"],
      ["complete-package", "Complete Package"]
    ];
    return null;
  }

  function populateGenericPackage() {
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const pkg = document.getElementById("package-select");
    if (!category || !manufacturer || !pkg) return;
    const options = packageOptionsFor(category.value, manufacturer.value);
    if (!options) return;
    pkg.innerHTML = '<option value="">-- Select a package --</option>';
    options.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];
      pkg.appendChild(option);
    });
    pkg.disabled = false;
  }

  function resetToNewItem(form) {
    if (typeof window.gearCashOutResetForNewItem === "function") {
      window.gearCashOutResetForNewItem();
      return;
    }
    form.reset();
    ["gear-category", "gear-manufacturer", "dji-model", "package-select"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const manufacturer = document.getElementById("gear-manufacturer");
    const model = document.getElementById("dji-model");
    const pkg = document.getElementById("package-select");
    if (manufacturer) { manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>'; manufacturer.disabled = true; }
    if (model) { model.innerHTML = '<option value="">-- Select a model --</option>'; model.disabled = true; }
    if (pkg) { pkg.innerHTML = '<option value="">-- Select a package --</option>'; pkg.disabled = true; }
    form.querySelectorAll('input[type="file"]').forEach(function (input) { try { input.value = ""; } catch (_) {} });
    form.querySelectorAll(".wizard-step").forEach(function (section) { section.hidden = Number(section.dataset.step) !== 1; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;
      const step = button.closest(".wizard-step");
      if (!step) return;
      const number = Number(step.dataset.step);

      if (number === 2 && button.classList.contains("btn-next")) {
        const category = document.getElementById("gear-category")?.value || "";
        const manufacturer = document.getElementById("gear-manufacturer")?.value || "";
        if (String(category).toLowerCase() !== "drone") populateGenericPackage();
        return;
      }

      if (number === 12 && button.id === "add-another-item") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        resetToNewItem(form);
      }
    }, true);

    ["gear-category", "gear-manufacturer", "dji-model"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", function () { window.setTimeout(populateGenericPackage, 0); });
    });
  });
})();
