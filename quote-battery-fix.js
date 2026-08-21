/* DJI package-battery fix.
   Step 3 selects the package only.
   Step 6 shows the package battery allowance derived from that package.
   Extra batteries are handled separately under Accessories / Step 10.
   Missing package batteries are recorded in Step 9 Package Contents.
*/
function initDjiBatteryFix() {
  "use strict";

  const form = document.getElementById("quote-form");
  if (!form) return;

  const step3 = () => form.querySelector('[data-step="3"]');
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

  function container() { return document.getElementById("batteries-container"); }

  function removeBatteryEntryControls() {
    const s6 = step6();
    if (!s6) return;
    s6.querySelector("#add-battery-btn")?.remove();
    s6.querySelectorAll(".btn-remove-battery").forEach(el => el.remove());
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
    `;
    box.appendChild(wrapper);
  }

  function renderBatteryEntries(expected) {
    const box = container();
    if (!box) return;
    box.innerHTML = "";
    for (let i = 1; i <= expected; i++) createRealBattery(box, i);
  }

  function removeBatteryControlsFromStep3() {
    const s3 = step3();
    if (!s3) return;
    s3.querySelectorAll("#package-battery-count, .gear-package-battery-count-label, .gear-battery-intro, #batteries-container, #add-battery-btn, .gear-package-battery, .gear-zero-battery-marker").forEach(el => el.remove());
  }

  function renderBatteryStep() {
    if (!isDJI()) return;
    const s6 = step6();
    const box = container();
    if (!s6 || !box) return;

    removeBatteryControlsFromStep3();
    removeBatteryEntryControls();
    s6.hidden = false;

    let heading = s6.querySelector("h3");
    if (heading) heading.textContent = "Step 6: Package Batteries";

    let intro = s6.querySelector(".gear-battery-intro");
    if (!intro) {
      intro = document.createElement("p");
      intro.className = "gear-battery-intro";
      s6.insertBefore(intro, box);
    }

    const expected = window.gearExpectedPackageBatteries();
    intro.innerHTML = `<strong>The selected package includes ${expected} package battery${expected === 1 ? "" : "ies"}.</strong> These are the batteries that belong to the package. Enter the details for these package batteries only. Any additional batteries are recorded separately under Accessories.`;

    let count = s6.querySelector("#package-battery-count");
    if (!count) {
      const label = document.createElement("label");
      label.className = "gear-package-battery-count-label";
      label.htmlFor = "package-battery-count";
      label.textContent = "Number of package batteries";
      count = document.createElement("select");
      count.id = "package-battery-count";
      count.disabled = true;
      label.appendChild(count);
      s6.insertBefore(label, box);
    }

    count.innerHTML = "";
    count.add(new Option(String(expected), String(expected), true, true));
    count.value = String(expected);
    count.title = "Automatically determined by the selected package";

    renderBatteryEntries(expected);
  }

  const observer = new MutationObserver(function () {
    if (!isDJI()) return;
    removeBatteryControlsFromStep3();
    const s6 = step6();
    if (s6 && !s6.hidden) renderBatteryStep();
  });
  observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

  form.addEventListener("change", function (event) {
    if (event.target?.id === "package-select") setTimeout(renderBatteryStep, 20);
  }, true);

  renderBatteryStep();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDjiBatteryFix, { once: true });
} else {
  initDjiBatteryFix();
}
