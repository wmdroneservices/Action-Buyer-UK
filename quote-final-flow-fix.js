/* GearCashOut final quote-flow corrections.
   1) Step 6 package battery count is always limited to the selected package allowance.
   2) Standalone DJI controllers and batteries have their own Step 1 categories and do not require a drone model/package.
*/
(function () {
  "use strict";

  const PACKAGE_BATTERIES = {
    "mini-5-pro|fly-more-rc-2": 3,
    "mini-4-pro|fly-more-rc-2": 3,
    "mini-4-pro|fly-more-rc-n2": 3,
    "mini-3-pro|fly-more-rc-n1": 3,
    "mini-3-pro|fly-more-dji-rc": 3,
    "mini-3|fly-more-rc-n1": 3,
    "mini-2|fly-more": 3,
    "neo|drone-only": 1,
    "neo|fly-more": 3,
    "neo-2|standard": 1,
    "neo-2|fly-more": 3,
    "flip|standard-rc-n3": 1,
    "flip|fly-more-rc-n3": 3,
    "flip|fly-more-rc-2": 3,
    "air|drone-only": 1,
    "air|standard": 1,
    "air|fly-more": 3,
    "air-2|drone-only": 1,
    "air-2|fly-more": 3,
    "air-2s|drone-only": 1,
    "air-2s|fly-more": 3,
    "air-3|drone-only": 1,
    "air-3|fly-more": 3,
    "air-3s|drone-only": 1,
    "air-3s|fly-more": 3,
    "mavic-2-pro|drone-only": 1,
    "mavic-2-pro|standard": 1,
    "mavic-2-pro|fly-more": 3,
    "mavic-2-zoom|drone-only": 1,
    "mavic-2-zoom|fly-more": 3,
    "mavic-3|drone-only": 1,
    "mavic-3|fly-more": 3,
    "mavic-3-classic|drone-only": 1,
    "mavic-3-classic|fly-more": 3,
    "mavic-3-pro|drone-only": 1,
    "mavic-3-pro|fly-more": 3,
    "mavic-3-pro-cine|drone-only": 1,
    "mavic-3-pro-cine|premium-combo": 3,
    "mavic-4-pro|drone-only": 1,
    "mavic-4-pro|fly-more": 3,
    "fpv|drone-only": 1,
    "fpv|fly-smart": 1,
    "avata|drone-only": 1,
    "avata|fly-smart": 2,
    "avata|pro-view": 2,
    "avata|explorer": 2,
    "avata-2|drone-only": 1,
    "avata-2|fly-more": 3
  };

  const CONTROLLERS = [
    ["rc-n1", "DJI RC-N1"], ["rc-n2", "DJI RC-N2 Controller"], ["rc-n3", "DJI RC-N3 Controller"],
    ["smart-controller", "DJI Smart Controller"], ["rc", "DJI RC Controller"], ["rc-2", "DJI RC 2 Controller"],
    ["rc-pro", "DJI RC Pro Controller"], ["rc-pro-enterprise", "DJI RC Pro Enterprise Controller"],
    ["rc-plus", "DJI RC Plus Controller"], ["fpv-remote", "DJI FPV Remote Controller"],
    ["fpv-remote-2", "DJI FPV Remote Controller 2"], ["fpv-remote-3", "DJI FPV Remote Controller 3"],
    ["motion-controller", "DJI Motion Controller"], ["rc-motion-2", "DJI RC Motion 2"], ["rc-motion-3", "DJI RC Motion 3"]
  ];

  const BATTERIES = [
    ["neo-battery", "DJI Neo Intelligent Flight Battery"],
    ["mini-2-mini-4k-mini-se-battery", "DJI Mini 2 / Mini 4K / Mini SE Intelligent Flight Battery"],
    ["mini-3-mini-4-pro-battery", "DJI Mini 3 / Mini 4 Pro Intelligent Flight Battery"],
    ["air-3-air-3s-battery", "DJI Air 3 / Air 3S Intelligent Flight Battery"],
    ["mavic-3-battery", "DJI Mavic 3 Intelligent Flight Battery"],
    ["avata-2-battery", "DJI Avata 2 Intelligent Flight Battery"],
    ["fpv-battery", "DJI FPV Intelligent Flight Battery"],
    ["tb65-battery", "DJI TB65 Intelligent Flight Battery"],
    ["wb37-battery", "DJI WB37 Intelligent Battery"]
  ];

  const CONTROLLER_CATEGORY = "dji-controller";
  const BATTERY_CATEGORY = "dji-battery";

  function standalone() {
    const value = String(document.getElementById("gear-category")?.value || "").toLowerCase();
    return value === CONTROLLER_CATEGORY || value === BATTERY_CATEGORY;
  }

  function accessoryKind() {
    return String(document.getElementById("gear-category")?.value || "").toLowerCase() === CONTROLLER_CATEGORY ? "controller" : "battery";
  }

  function showStep(number) {
    const form = document.getElementById("quote-form");
    if (!form) return;
    form.querySelectorAll(".wizard-step").forEach(function (step) { step.hidden = Number(step.dataset.step) !== number; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function packageAllowance() {
    const model = document.getElementById("dji-model")?.value || "";
    const pkg = document.getElementById("package-select")?.value || "";
    return Math.max(1, Number(PACKAGE_BATTERIES[model + "|" + pkg] || 1));
  }

  function fixPackageBatteryDropdown() {
    const form = document.getElementById("quote-form");
    const step6 = form?.querySelector('.wizard-step[data-step="6"]');
    if (!step6) return;
    const select = step6.querySelector("#package-battery-count") || Array.from(step6.querySelectorAll("select")).find(function (candidate) {
      const label = candidate.id ? step6.querySelector('label[for="' + candidate.id + '"]') : null;
      return label && /number of package batteries being supplied/i.test(label.textContent);
    }) || step6.querySelector("select");
    if (!select) return;

    const allowance = packageAllowance();
    const current = Number(select.value);
    const keep = Number.isFinite(current) && current >= 1 && current <= allowance ? current : Math.min(allowance, 1);
    const wanted = Array.from({ length: allowance }, function (_, i) { return String(i + 1); });
    const actual = Array.from(select.options).map(function (option) { return option.value; });
    if (actual.length !== wanted.length || actual.some(function (value, index) { return value !== wanted[index]; })) {
      select.innerHTML = "";
      wanted.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }
    select.value = String(keep);
    select.dataset.packageBatteryAllowance = String(allowance);
  }

  function startStep6Guard() {
    const form = document.getElementById("quote-form");
    if (!form || form.dataset.finalStep6Guard === "1") return;
    form.dataset.finalStep6Guard = "1";

    const observer = new MutationObserver(function (mutations) {
      let relevant = false;
      mutations.forEach(function (mutation) {
        if (mutation.type !== "childList") return;
        const target = mutation.target;
        if (target && target.closest && target.closest('.wizard-step[data-step="6"]')) relevant = true;
      });
      if (relevant) requestAnimationFrame(fixPackageBatteryDropdown);
    });
    observer.observe(form, { childList: true, subtree: true });

    form.addEventListener("change", function (event) {
      if (event.target.id === "package-select" || event.target.id === "dji-model" || event.target.id === "package-battery-count") {
        setTimeout(fixPackageBatteryDropdown, 0);
        setTimeout(fixPackageBatteryDropdown, 100);
        setTimeout(fixPackageBatteryDropdown, 300);
      }
    }, true);

    let ticks = 0;
    const timer = setInterval(function () {
      ticks += 1;
      const step6 = form.querySelector('.wizard-step[data-step="6"]');
      if (step6 && !step6.hidden) fixPackageBatteryDropdown();
      if (ticks >= 120) clearInterval(timer);
    }, 100);
  }

  function setupStandaloneCategories() {
    const category = document.getElementById("gear-category");
    const form = document.getElementById("quote-form");
    if (!category || !form || category.dataset.finalAccessoryFlow === "1") return;
    category.dataset.finalAccessoryFlow = "1";

    function addOption(value, text) {
      if (Array.from(category.options).some(function (option) { return option.value === value; })) return;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      category.appendChild(option);
    }
    addOption(CONTROLLER_CATEGORY, "DJI Controllers");
    addOption(BATTERY_CATEGORY, "DJI Batteries");

    function apply() {
      if (!standalone()) return;
      const manufacturer = document.getElementById("gear-manufacturer");
      const model = document.getElementById("dji-model");
      const packageSelect = document.getElementById("package-select");
      const list = accessoryKind() === "controller" ? CONTROLLERS : BATTERIES;
      if (manufacturer) {
        manufacturer.innerHTML = '<option value="DJI">DJI</option>';
        manufacturer.value = "DJI";
        manufacturer.disabled = true;
      }
      if (model) {
        model.innerHTML = '<option value="">-- Select ' + (accessoryKind() === "controller" ? "a controller" : "a battery") + " --</option>';
        list.forEach(function (item) {
          const option = document.createElement("option");
          option.value = item[0];
          option.textContent = item[1];
          model.appendChild(option);
        });
        model.disabled = false;
      }
      if (packageSelect) {
        packageSelect.innerHTML = '<option value="">-- Not applicable --</option>';
        packageSelect.value = "";
        packageSelect.disabled = true;
      }
      const step2 = form.querySelector('.wizard-step[data-step="2"]');
      if (step2) {
        const heading = step2.querySelector("h3");
        const label = step2.querySelector('label[for="dji-model"]');
        const controller = accessoryKind() === "controller";
        if (heading) heading.textContent = controller ? "Step 2: DJI Controller" : "Step 2: DJI Battery";
        if (label) label.textContent = controller ? "Select controller" : "Select battery";
      }
    }

    category.addEventListener("change", function () { setTimeout(apply, 0); });
    apply();

    form.addEventListener("click", function (event) {
      if (!standalone()) return;
      const button = event.target.closest("button");
      if (!button) return;
      const step = button.closest(".wizard-step");
      if (!step) return;
      const number = Number(step.dataset.step);

      if (button.classList.contains("btn-next") && number === 2) {
        if (!document.getElementById("dji-model")?.value) return;
        event.preventDefault(); event.stopImmediatePropagation(); showStep(4); return;
      }
      if (button.classList.contains("btn-back") && number === 4) {
        event.preventDefault(); event.stopImmediatePropagation(); showStep(2); return;
      }
      if (button.classList.contains("btn-next") && number === 4) {
        event.preventDefault(); event.stopImmediatePropagation(); showStep(8); return;
      }
      if (button.classList.contains("btn-back") && number === 8) {
        event.preventDefault(); event.stopImmediatePropagation(); showStep(4); return;
      }
    }, true);
  }

  function init() {
    setupStandaloneCategories();
    startStep6Guard();
    fixPackageBatteryDropdown();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
