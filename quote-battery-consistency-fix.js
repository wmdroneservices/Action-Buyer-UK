/* Keeps package-battery entitlement, package contents and accessory batteries consistent. */
function initBatteryConsistencyFix() {
  "use strict";

  const form = document.getElementById("quote-form");
  if (!form) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const step = n => $(`#quote-form .wizard-step[data-step="${n}"]`);

  function expected() {
    return Number(window.gearExpectedPackageBatteries?.() || 1);
  }

  function missingMarked() {
    return $$('.package-content-select[data-content-id^="battery-"]').filter(s => s.value === "missing").length;
  }

  function presentMarked() {
    return $$('.package-content-select[data-content-id^="battery-"]').filter(s => s.value === "present").length;
  }

  function addStep9Notice() {
    const s9 = step(9);
    if (!s9 || s9.hidden) return;

    let notice = $(".battery-consistency-notice", s9);
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "battery-consistency-notice";
      notice.style.cssText = "margin:1rem 0;padding:1rem;border:1px solid #ccc;border-radius:6px;";
      const box = $("#package-contents-list", s9);
      if (box) box.parentNode.insertBefore(notice, box);
    }

    const e = expected();
    notice.innerHTML = `<strong>Battery check:</strong> The selected package includes ${e} package battery${e === 1 ? "" : "ies"}. Mark each package battery below as <strong>Present</strong> or <strong>Missing</strong>. Any additional batteries are handled separately under Accessories.`;
  }

  function addStep12Breakdown() {
    const s12 = step(12);
    if (!s12 || s12.hidden) return;

    let box = $(".battery-valuation-breakdown", s12);
    if (!box) {
      box = document.createElement("div");
      box.className = "battery-valuation-breakdown";
      box.style.cssText = "margin:1rem 0;padding:1rem;border:1px solid #ccc;border-radius:6px;";
      const summary = $("#quote-summary", s12);
      if (summary) summary.insertAdjacentElement("afterend", box);
    }

    const e = expected();
    const missing = missingMarked();
    const extra = Number($("#extra-battery-count")?.value || 0);
    const packagePresent = presentMarked();

    box.innerHTML = `
      <h4>Battery valuation check</h4>
      <p><strong>Package allowance:</strong> ${e}</p>
      <p><strong>Package batteries marked present:</strong> ${packagePresent}</p>
      <p><strong>Package batteries marked missing:</strong> ${missing}</p>
      <p><strong>Extra batteries:</strong> ${extra}</p>
      <p>Missing package batteries are deducted from the package valuation. Extra batteries are valued separately. Battery cycle deductions are applied to the package batteries supplied.</p>
    `;
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const s9 = button.closest('.wizard-step[data-step="9"]');
    if (!s9 || !button.classList.contains("btn-next")) return;

    const batterySelects = $$('.package-content-select[data-content-id^="battery-"]', s9);
    const e = expected();

    /* Step 9 must contain one status selector for every battery in the
       selected package. It is valid for some or all of them to be missing. */
    if (batterySelects.length !== e || batterySelects.some(x => !["present", "missing"].includes(x.value))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(`The selected package contains ${e} package battery${e === 1 ? "" : "ies"}. Please mark each package battery as Present or Missing.`);
      return;
    }
  }, true);

  const observer = new MutationObserver(function () {
    addStep9Notice();
    addStep12Breakdown();
  });
  observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

  form.addEventListener("change", function (event) {
    if (event.target?.classList?.contains("package-content-select") ||
        event.target?.id === "package-battery-count" ||
        event.target?.id === "extra-battery-count") {
      addStep9Notice();
      addStep12Breakdown();
    }
  });

  addStep9Notice();
  addStep12Breakdown();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBatteryConsistencyFix, { once: true });
} else {
  initBatteryConsistencyFix();
}
