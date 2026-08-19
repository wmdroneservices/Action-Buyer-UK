/* GearCashOut DJI package compatibility layer.
   The DJI package catalogue below is based on DJI package/in-the-box data.
   It keeps Step 6 battery entitlement aligned with the exact package selected.
   It also fills package variants which were missing from the original quote.js.
*/
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

    step.querySelectorAll("#quote-important, #gear-basket-box, .quote-basket-box, #quote-result-action").forEach(function (el) { el.remove(); });

    const title = document.getElementById("quote-result-title");
    if (title) title.textContent = "Manual Valuation Required";

    let basket = [];
    try { basket = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]"); } catch (_) { basket = []; }
    if (!Array.isArray(basket)) basket = [];

    if (!basket.some(function (item) { return item.model === model.value && item.manufacturer === manufacturer.value; })) {
      basket.push({ category: category.value, categoryName, manufacturer: manufacturer.value, manufacturerName, model: model.value, modelName, valuation: "manual", amount: null });
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
      '<div class="quote-basket-preview"><h3>Your Quote</h3><p>You can add more equipment before submitting your quote.</p><ol>' + rows + '</ol><p><strong>Total:</strong> Manual valuation after review</p></div>' +
      '<div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">' +
        '<button type="button" class="btn" id="add-another-item">Add Another Item</button>' +
        '<button type="button" class="btn" id="continue-with-quote" data-quote-action="manual">Continue with This Quote</button>' +
      '</div>';
  };

  /* Verified package battery structure.
     standard = the normal single supplied aircraft battery.
     combo = three standard Intelligent Flight Batteries.
     plus = the higher-capacity Plus batteries where DJI sells a Plus package.
     mixed-plus is Mini 3: one standard battery + two Plus batteries. */
  const DJI_PACKAGE_DATA = {
    "mini-2-se": {
      "drone-only": { label: "Standard Package", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mini-4k": {
      "drone-only": { label: "Standard Package", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mini-2": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-n1": { label: "Standard + RC-N1", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mini-3": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-n1": { label: "Standard + RC-N1", count: 1, battery: "Intelligent Flight Battery" },
      "standard-dji-rc": { label: "Standard + DJI RC", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-rc-n1": { label: "Fly More Combo + RC-N1", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-dji-rc": { label: "Fly More Combo + DJI RC", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-plus-rc-n1": { label: "Fly More Combo Plus + RC-N1", count: 3, battery: "1 × Intelligent Flight Battery + 2 × Intelligent Flight Battery Plus" },
      "fly-more-plus-dji-rc": { label: "Fly More Combo Plus + DJI RC", count: 3, battery: "1 × Intelligent Flight Battery + 2 × Intelligent Flight Battery Plus" }
    },
    "mini-3-pro": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "drone-rc-n1": { label: "Drone + RC-N1", count: 1, battery: "Intelligent Flight Battery" },
      "drone-dji-rc": { label: "Drone + DJI RC", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-rc-n1": { label: "Fly More Combo + RC-N1", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-dji-rc": { label: "Fly More Combo + DJI RC", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mini-4-pro": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-n2": { label: "Standard + RC-N2", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-2": { label: "Standard + RC 2", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-rc-n2": { label: "Fly More Combo + RC-N2", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-rc-2": { label: "Fly More Combo + RC 2", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-plus-rc-2": { label: "Fly More Combo Plus + RC 2", count: 3, battery: "3 × Intelligent Flight Battery Plus" }
    },
    "mini-5-pro": {
      "drone-only": { label: "Standard + RC-N3", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-n3": { label: "Standard + RC-N3", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-2": { label: "Standard + RC 2", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-rc-n3": { label: "Fly More Combo + RC-N3", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-rc-2": { label: "Fly More Combo + RC 2", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-plus-rc-2": { label: "Fly More Combo Plus + RC 2", count: 3, battery: "3 × Intelligent Flight Battery Plus" }
    },
    "neo": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" },
      "motion-fly-more": { label: "Motion Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "neo-2": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-drone-only": { label: "Fly More Combo (Drone Only)", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo + RC-N3", count: 3, battery: "3 × Intelligent Flight Battery" },
      "motion-fly-more": { label: "Motion Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "flip": {
      "standard-rc-n3": { label: "Standard + RC-N3", count: 1, battery: "Intelligent Flight Battery" },
      "standard-rc-2": { label: "Standard + RC 2", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-rc-n3": { label: "Fly More Combo + RC-N3", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-rc-2": { label: "Fly More Combo + RC 2", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "air": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "standard": { label: "Standard Package", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "air-2": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "air-2s": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "air-3": {
      "drone-only": { label: "Standard + RC-N2", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "air-3s": {
      "drone-only": { label: "Standard + RC-N3", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mavic-2-pro": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "standard": { label: "Standard Package", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "mavic-2-zoom": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "mavic-3": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "mavic-3-classic": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "mavic-3-pro": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-more": { label: "Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "mavic-3-pro-cine": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "premium-combo": { label: "Cine Premium Combo", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "mavic-4-pro": { "drone-only": { label: "Standard + RC 2", count: 1, battery: "Intelligent Flight Battery" }, "fly-more": { label: "Fly More Combo + RC 2", count: 3, battery: "3 × Intelligent Flight Battery" }, "creator-combo": { label: "512GB Creator Combo + RC Pro 2", count: 3, battery: "3 × Intelligent Flight Battery" } },
    "fpv": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-smart": { label: "Fly Smart Combo", count: 1, battery: "Intelligent Flight Battery" } },
    "avata": { "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" }, "fly-smart": { label: "Fly Smart Combo", count: 1, battery: "Intelligent Flight Battery" }, "pro-view": { label: "Pro-View Combo", count: 1, battery: "Intelligent Flight Battery" }, "explorer": { label: "Explorer Combo", count: 1, battery: "Intelligent Flight Battery" } },
    "avata-2": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-single": { label: "Fly More Combo (Single Battery)", count: 1, battery: "Intelligent Flight Battery" },
      "fly-more-three": { label: "Fly More Combo (Three Batteries)", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-smart-single": { label: "Fly Smart Combo (Single Battery)", count: 1, battery: "Intelligent Flight Battery" },
      "fly-smart-three": { label: "Fly Smart Combo (Three Batteries)", count: 3, battery: "3 × Intelligent Flight Battery" },
      "explorer": { label: "Explorer Combo", count: 3, battery: "3 × Intelligent Flight Battery" }
    },
    "avata-360": {
      "drone-only": { label: "Drone Only", count: 1, battery: "Intelligent Flight Battery" },
      "rc-2": { label: "DJI RC 2", count: 1, battery: "Intelligent Flight Battery" },
      "motion-fly-more": { label: "Motion Fly More Combo", count: 3, battery: "3 × Intelligent Flight Battery" },
      "fly-more-rc-2": { label: "Fly More Combo + RC 2", count: 3, battery: "3 × Intelligent Flight Battery" }
    }
  };

  window.gearDjiPackageData = DJI_PACKAGE_DATA;

  function isDJI() {
    return String(document.getElementById("gear-category")?.value || "").toLowerCase() === "drone" &&
           String(document.getElementById("gear-manufacturer")?.value || "").toLowerCase() === "dji";
  }

  function currentModel() { return String(document.getElementById("dji-model")?.value || "").toLowerCase(); }
  function packageSelect() { return document.getElementById("package-select"); }

  function rebuildPackageOptions() {
    if (!isDJI()) return;
    const model = currentModel();
    const data = DJI_PACKAGE_DATA[model];
    const select = packageSelect();
    if (!data || !select) return;

    const previous = select.value;
    select.innerHTML = '<option value="">-- Select a package --</option>';
    Object.keys(data).forEach(function (id) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data[id].label;
      select.appendChild(option);
    });
    if (data[previous]) select.value = previous;
  }

  function selectedPackageData() {
    const data = DJI_PACKAGE_DATA[currentModel()];
    const select = packageSelect();
    if (!data || !select) return null;
    return data[select.value] || null;
  }

  function expectedBatteryData() {
    const selected = selectedPackageData();
    if (selected) return selected;
    const model = currentModel();
    const select = packageSelect();
    const name = select && select.selectedIndex >= 0 ? String(select.options[select.selectedIndex].textContent || "").toLowerCase() : "";
    if (!select || !select.value) return null;
    if (name.includes("fly more") || name.includes("premium combo") || name.includes("creator combo")) return { count: 3, battery: "3 × Intelligent Flight Battery" };
    return { count: 1, battery: "Intelligent Flight Battery" };
  }

  function updateBatteryStep() {
    if (!isDJI()) return;
    const step6 = form.querySelector('[data-step="6"]');
    if (!step6) return;
    const selected = expectedBatteryData();
    if (!selected) return;

    let intro = step6.querySelector(".gear-battery-intro");
    if (!intro) {
      intro = document.createElement("p");
      intro.className = "gear-battery-intro";
      const box = document.getElementById("batteries-container");
      if (box) step6.insertBefore(intro, box);
    }

    intro.innerHTML = `<strong>${selected.count} package batter${selected.count === 1 ? "y" : "ies"} expected from the selected package.</strong> Battery type: ${selected.battery}. Enter only the package batteries you are actually sending. If none are supplied, select 0. Extra batteries are entered separately in Step 10.`;

    const count = document.getElementById("package-battery-count");
    if (count) {
      const old = Number(count.value);
      count.innerHTML = "";
      for (let i = 0; i <= selected.count; i++) count.add(new Option(String(i), String(i)));
      count.value = Number.isInteger(old) && old >= 0 && old <= selected.count ? String(old) : String(selected.count);
    }

    /* Keep Step 9's battery rows consistent when quote.js falls back to one
       battery for a newly-added package variant. */
    const step9 = form.querySelector('[data-step="9"]');
    if (step9 && !step9.hidden) repairStep9Batteries(selected);
  }

  function repairStep9Batteries(selected) {
    const container = document.getElementById("package-contents-list");
    if (!container) return;
    const rows = Array.from(container.querySelectorAll(".package-content-select")).filter(function (s) {
      return /^battery-\d+$/.test(s.dataset.contentId || "");
    });
    if (rows.length === selected.count) return;

    rows.slice(selected.count).forEach(function (select) {
      const row = select.closest(".package-content-row");
      if (row) row.remove();
    });

    const existing = Array.from(container.querySelectorAll(".package-content-select")).filter(function (s) { return /^battery-\d+$/.test(s.dataset.contentId || ""); });
    for (let i = existing.length + 1; i <= selected.count; i++) {
      const row = document.createElement("div");
      row.className = "package-content-row";
      row.innerHTML = `<label for="contents-battery-${i}">Battery ${i} (${selected.battery})</label><select id="contents-battery-${i}" class="package-content-select" data-content-id="battery-${i}"><option value="">-- Select status --</option><option value="present">Present</option><option value="missing">Missing</option></select>`;
      container.appendChild(row);
    }
  }

  function updatePackageLabelInResult() {
    const select = packageSelect();
    if (!select) return;
    const selected = selectedPackageData();
    if (!selected) return;
    window.gearSelectedPackageLabel = selected.label;
  }

  form.addEventListener("change", function (event) {
    if (!isDJI()) return;
    if (event.target?.id === "dji-model") {
      window.setTimeout(function () {
        rebuildPackageOptions();
        updateBatteryStep();
      }, 30);
    }
    if (event.target?.id === "package-select") {
      updatePackageLabelInResult();
      window.setTimeout(updateBatteryStep, 30);
    }
  }, true);

  const observer = new MutationObserver(function () {
    if (!isDJI()) return;
    if (!packageSelect()?.value && currentModel()) rebuildPackageOptions();
    updateBatteryStep();
  });
  observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

  window.setTimeout(function () {
    rebuildPackageOptions();
    updateBatteryStep();
  }, 50);
})();
