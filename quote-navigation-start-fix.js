/* Start-of-wizard navigation fix.
   Handles Steps 1-3 for the generic equipment catalogue before the older
   compatibility shims see the click. This keeps the visible select state,
   catalogue values and wizard sections in sync.
*/
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  const pkg = document.getElementById("package-select");
  if (!form || !category || !manufacturer || !model || !pkg) return;

  function visibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (s) {
      return !s.hidden;
    });
  }

  function show(number) {
    form.querySelectorAll(".wizard-step").forEach(function (s) {
      s.hidden = Number(s.dataset.step) !== number;
    });
    const progress = document.getElementById("progress-indicator");
    if (progress) {
      progress.querySelectorAll(".progress-step").forEach(function (item, index) {
        const n = Number(item.dataset.step || (index + 1));
        item.classList.toggle("active", n === number);
        if (n === number) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectedValue(select) {
    if (!select) return "";
    const option = select.options && select.selectedIndex >= 0
      ? select.options[select.selectedIndex]
      : null;
    return option ? String(option.value || "").trim() : String(select.value || "").trim();
  }

  function selectedText(select) {
    if (!select) return "";
    const option = select.options && select.selectedIndex >= 0
      ? select.options[select.selectedIndex]
      : null;
    return option ? String(option.textContent || "").trim() : "";
  }

  function catalogue() {
    return window.gearCatalogue || {};
  }

  function canonicalCategory() {
    let value = selectedValue(category);
    if (value) return value;
    const text = selectedText(category).toLowerCase();
    const map = {
      "drone": "drone",
      "action camera": "action-camera",
      "camera": "camera",
      "camera lens": "lens",
      "accessory": "accessory"
    };
    return map[text] || "";
  }

  function canonicalManufacturer(cat) {
    let value = selectedValue(manufacturer);
    if (value) return value;
    const text = selectedText(manufacturer).toLowerCase();
    const data = catalogue()[cat] || {};
    return Object.keys(data).find(function (name) {
      return name.toLowerCase() === text;
    }) || "";
  }

  function populateModels(cat, maker) {
    const data = catalogue()[cat] || {};
    const list = data[maker] || [];
    model.innerHTML = '<option value="">-- Select a model --</option>';
    list.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];
      model.appendChild(option);
    });
    model.disabled = list.length === 0;
  }

  function populatePackages(modelId) {
    const options = {
      "mini-5-pro": { "drone-only": "Drone only", "standard-rc-n3": "Standard + RC-N3", "fly-more-rc-n3": "Fly More Combo + RC-N3", "fly-more-rc-2": "Fly More Combo + RC 2", "fly-more-plus-rc-2": "Fly More Combo Plus + RC 2" },
      "mini-4-pro": { "drone-only": "Drone only", "standard-rc-n2": "Standard + RC-N2", "standard-rc-2": "Standard + RC 2", "fly-more-rc-n2": "Fly More Combo + RC-N2", "fly-more-rc-2": "Fly More Combo + RC 2" },
      "mini-3-pro": { "drone-only": "Drone only", "drone-rc-n1": "Drone + RC-N1", "drone-dji-rc": "Drone + DJI RC", "fly-more-rc-n1": "Fly More Combo + RC-N1", "fly-more-dji-rc": "Fly More Combo + DJI RC" },
      "mini-3": { "drone-only": "Drone only", "standard-rc-n1": "Standard + RC-N1", "fly-more-rc-n1": "Fly More Combo + RC-N1" },
      "mini-2": { "drone-only": "Drone only", "standard-rc-n1": "Standard + RC-N1", "fly-more": "Fly More Combo" },
      "neo": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "neo-2": { "standard": "Standard Package", "fly-more": "Fly More Combo" },
      "flip": { "standard-rc-n3": "Standard + RC-N3", "fly-more-rc-n3": "Fly More Combo + RC-N3", "fly-more-rc-2": "Fly More Combo + RC 2" },
      "air": { "drone-only": "Drone only", "standard": "Standard Package", "fly-more": "Fly More Combo" },
      "air-2": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "air-2s": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "air-3": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "air-3s": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "mavic-2-pro": { "drone-only": "Drone only", "standard": "Standard Package", "fly-more": "Fly More Combo" },
      "mavic-2-zoom": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "mavic-3": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "mavic-3-classic": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "mavic-3-pro": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "mavic-3-pro-cine": { "drone-only": "Drone only", "premium-combo": "Premium Combo" },
      "mavic-4-pro": { "drone-only": "Drone only", "fly-more": "Fly More Combo" },
      "fpv": { "drone-only": "Drone only", "fly-smart": "Fly Smart Combo" },
      "avata": { "drone-only": "Drone only", "fly-smart": "Fly Smart Combo", "pro-view": "Pro-View Combo", "explorer": "Explorer Combo" },
      "avata-2": { "drone-only": "Drone only", "fly-more": "Fly More Combo" }
    };
    const list = options[modelId] || {};
    pkg.innerHTML = '<option value="">-- Select a package --</option>';
    Object.entries(list).forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      pkg.appendChild(option);
    });
    pkg.disabled = Object.keys(list).length === 0;
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !form.contains(button)) return;
    if (!button.classList.contains("btn-next")) return;

    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    /* Only intercept the first three generic steps. DJI and all later steps
       remain with the existing wizard logic. */
    if (number === 1) {
      const cat = canonicalCategory();
      const maker = canonicalManufacturer(cat);
      if (!cat) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert("Please select an equipment type.");
        return;
      }
      if (!maker) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert("Please select a manufacturer.");
        return;
      }
      category.value = cat;
      manufacturer.value = maker;
      const data = catalogue()[cat] || {};
      if (!data[maker]) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert("This manufacturer is not currently available.");
        return;
      }
      populateModels(cat, maker);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      show(2);
      return;
    }

    if (number === 2) {
      const modelId = selectedValue(model);
      if (!modelId) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert("Please select a model.");
        return;
      }
      populatePackages(modelId);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      show(3);
      return;
    }

    if (number === 3) {
      if (!selectedValue(pkg)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        alert("Please select the exact package.");
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      show(4);
    }
  }, true);
});
