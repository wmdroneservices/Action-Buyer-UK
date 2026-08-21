/* Package flow fix.
   Step 6 is the package-battery supply screen. Its quantity is driven by
   the selected package. Extra batteries remain separate accessories in
   Step 9.
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

  function expectedPackageBatteries() {
    const model = document.getElementById("dji-model")?.value || "";
    const pkg = document.getElementById("package-select")?.value || "";
    return PACKAGE_BATTERIES[model + "|" + pkg] || 1;
  }

  window.gearExpectedPackageBatteries = expectedPackageBatteries;

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    const progress = document.getElementById("progress-indicator");
    if (!form) return;

    if (progress && !Array.from(progress.querySelectorAll(".progress-step")).some(el => /^6\./.test(el.textContent.trim()))) {
      const item = document.createElement("li");
      item.className = "progress-step";
      item.textContent = "6. Package Batteries";
      const step5 = Array.from(progress.querySelectorAll(".progress-step")).find(el => /^5\./.test(el.textContent.trim()));
      if (step5 && step5.nextSibling) progress.insertBefore(item, step5.nextSibling);
      else progress.appendChild(item);
    }

    function enforceBatteryCountDropdown() {
      const step6 = form.querySelector('.wizard-step[data-step="6"]');
      if (!step6) return;
      const selects = Array.from(step6.querySelectorAll("select"));
      if (!selects.length) return;

      const select = selects.find(function (candidate) {
        const label = candidate.id ? step6.querySelector('label[for="' + candidate.id + '"]') : null;
        return label && /number of package batteries being supplied/i.test(label.textContent);
      }) || selects[0];

      const allowance = Math.max(1, Number(expectedPackageBatteries()) || 1);
      const current = Number(select.value);
      const selected = Number.isFinite(current) && current >= 1 && current <= allowance ? current : allowance;
      const wanted = Array.from({ length: allowance }, (_, i) => String(i + 1));
      const actual = Array.from(select.options).map(option => option.value);
      const correct = actual.length === wanted.length && actual.every((value, index) => value === wanted[index]);

      if (!correct) {
        select.innerHTML = "";
        wanted.forEach(function (value) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });
      }
      select.value = String(selected);
      select.dataset.packageBatteryAllowance = String(allowance);
    }

    function scheduleBatteryCountFix() {
      enforceBatteryCountDropdown();
      setTimeout(enforceBatteryCountDropdown, 50);
      setTimeout(enforceBatteryCountDropdown, 150);
      setTimeout(enforceBatteryCountDropdown, 400);
    }

    form.addEventListener("change", function (event) {
      if (event.target.id === "package-select" || event.target.id === "dji-model" || event.target.closest('.wizard-step[data-step="6"]')) {
        scheduleBatteryCountFix();
      }
    }, true);

    form.addEventListener("click", function (event) {
      const category = String(document.getElementById("gear-category")?.value || "").toLowerCase();
      const manufacturer = String(document.getElementById("gear-manufacturer")?.value || "").toLowerCase();
      if (category !== "drone" || manufacturer !== "dji") return;
      const button = event.target.closest("button");
      if (!button || !button.classList.contains("btn-next")) return;
      const step = button.closest(".wizard-step");
      if (!step || Number(step.dataset.step) !== 5) return;
      setTimeout(function () {
        const step6 = form.querySelector('.wizard-step[data-step="6"]');
        if (!step6) return;
        if (form.querySelector('.wizard-step:not([hidden])')?.dataset.step === "5") {
          form.querySelectorAll(".wizard-step").forEach(s => { s.hidden = s !== step6; });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        scheduleBatteryCountFix();
      }, 0);
    }, true);

    scheduleBatteryCountFix();
  });
})();
