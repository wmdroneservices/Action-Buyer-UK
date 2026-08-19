/* DJI battery-step fix.
   Step 6 records ONLY the batteries supplied as part of the selected package.
   Package entitlement remains separate and is always derived from packageSpecs.
   Extra batteries are handled later in Step 10.

   The core quote engine currently requires at least one .battery-entry.
   When the seller supplies zero package batteries, we use a hidden zero-battery
   marker so the core navigation can continue without treating it as a real
   battery. Pricing remains driven by Step 9 package-content status.
*/
function initDjiBatteryFix() {
  "use strict";

  const form = document.getElementById("quote-form");
  if (!form) return;

  const step6 = () => form.querySelector('[data-step="6"]');
  const modelSelect = () => document.getElementById("dji-model");
  const packageSelect = () => document.getElementById("package-select");

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

  window.gearExpectedPackageBatteries = function () {
    const key = `${modelSelect()?.value || ""}|${packageSelect()?.value || ""}`;
    return PACKAGE_BATTERIES[key] || 1;
  };

  function isDJI() {
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    return String(category?.value || "").toLowerCase() === "drone" &&
           String(manufacturer?.value || "").toLowerCase() === "dji";
  }

  function expectedPackageBatteries() {
    return window.gearExpectedPackageBatteries();
  }

  function container() {
    return document.getElementById("batteries-container");
  }

  function removeRealEntries() {
    const box = container();
    if (!box) return;
    box.querySelectorAll(".battery-entry").forEach(el => el.remove());
  }

  function createRealBattery(box, number) {
    const wrapper = document.createElement("div");
    wrapper.className = "battery-entry gear-package-battery";
    wrapper.dataset.number = String(number);
    wrapper.innerHTML = `
      <h4>Package Battery ${number}</h4>
      <label for="gear-package-battery-type-${number}">Battery Type</label>
      <input type="text" id="gear-package-battery-type-${number}" class="battery-type" placeholder="Example: Intelligent Flight Battery">
      <label for="gear-package-battery-cycles-${number}">Battery Cycle Count</label>
      <input type="number" id="gear-package-battery-cycles-${number}" class="battery-cycles" min="0" step="1" placeholder="0">
      <button type="button" class="btn-remove-battery">Remove Battery</button>
    `;
    box.appendChild(wrapper);
  }

  function renderBatteryEntries(count) {
    const box = container();
    if (!box) return;

    const existingReal = Array.from(box.querySelectorAll(".gear-package-battery"));
    const existingZero = box.querySelector(".gear-zero-battery-marker");

    if (count === 0 && existingZero && existingReal.length === 0) return;
    if (count > 0 && !existingZero && existingReal.length === count) return;

    removeRealEntries();
    if (existingZero) existingZero.remove();

    if (count === 0) {
      const marker = document.createElement("div");
      marker.className = "battery-entry gear-zero-battery-marker";
      marker.dataset.zeroBattery = "true";
      marker.hidden = true;
      marker.innerHTML = `
        <input type="text" class="battery-type" value="No battery supplied" aria-hidden="true">
        <input type="number" class="battery-cycles" value="0" aria-hidden="true">
      `;
      box.appendChild(marker);
      return;
    }

    for (let i = 1; i <= count; i++) createRealBattery(box, i);
  }

  function renderBatteryStep() {
    if (!isDJI()) return;
    const s6 = step6();
    const box = container();
    if (!s6 || !box) return;

    s6.hidden = false;

    let heading = s6.querySelector("h3");
    if (heading) heading.textContent = "Step 6: Package Batteries";

    let intro = s6.querySelector(".gear-battery-intro");
    if (!intro) {
      intro = document.createElement("p");
      intro.className = "gear-battery-intro";
      s6.insertBefore(intro, box);
    }

    const expected = expectedPackageBatteries();
    intro.innerHTML = `<strong>${expected} package battery${expected === 1 ? "" : "ies"} expected from the selected package.</strong> Enter only the package batteries you are actually sending. If none are supplied, select 0. Extra batteries are entered separately in Step 10.`;

    let count = s6.querySelector("#package-battery-count");
    if (!count) {
      const label = document.createElement("label");
      label.className = "gear-package-battery-count-label";
      label.htmlFor = "package-battery-count";
      label.textContent = "Number of package batteries being supplied";

      count = document.createElement("select");
      count.id = "package-battery-count";
      label.appendChild(count);
      s6.insertBefore(label, box);

      count.addEventListener("change", function () {
        renderBatteryEntries(Number(count.value));
      });
    }

    const current = Number(count.value);
    count.innerHTML = "";
    for (let i = 0; i <= expected; i++) count.add(new Option(String(i), String(i)));
    count.value = Number.isInteger(current) && current >= 0 && current <= expected
      ? String(current)
      : String(expected);

    renderBatteryEntries(Number(count.value));
  }

  function resetOnPackageChange() {
    const box = container();
    if (box) box.innerHTML = "";
    const count = document.getElementById("package-battery-count");
    if (count) count.value = "";
  }

  const observer = new MutationObserver(function () {
    if (!isDJI()) return;
    const s6 = step6();
    if (s6 && !s6.hidden) renderBatteryStep();
  });
  observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

  form.addEventListener("change", function (event) {
    if (event.target?.id === "package-select") {
      resetOnPackageChange();
      setTimeout(renderBatteryStep, 20);
    }
  }, true);

  form.addEventListener("click", function (event) {
    if (!isDJI()) return;
    const button = event.target.closest("button");
    if (!button) return;
    const s6 = button.closest('.wizard-step[data-step="6"]');
    if (!s6 || !button.classList.contains("btn-next")) return;

    const count = Number(document.getElementById("package-battery-count")?.value);
    if (!Number.isInteger(count) || count < 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("Please select how many package batteries you are supplying.");
      return;
    }

    if (count === 0) renderBatteryEntries(0);
  }, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDjiBatteryFix, { once: true });
} else {
  initDjiBatteryFix();
}
