/* Keeps package-battery entitlement, supplied batteries and missing-item
   deductions consistent throughout the quote flow. */
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

  function supplied() {
    return Number($("#package-battery-count")?.value || 0);
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
    const s = supplied();
    notice.innerHTML = `<strong>Battery check:</strong> This package normally contains ${e} battery${e === 1 ? "" : "ies"}. Step 6 says you are supplying ${s}. When checking the package below, mark ${s} as <strong>Present</strong> and ${Math.max(0, e - s)} as <strong>Missing</strong>. Extra batteries are handled separately in Step 10.`;
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
    const s = supplied();
    const missing = missingMarked();
    const extra = Number($("#extra-battery-count")?.value || 0);
    const packagePresent = presentMarked();

    box.innerHTML = `
      <h4>Battery valuation check</h4>
      <p><strong>Package allowance:</strong> ${e}</p>
      <p><strong>Package batteries supplied:</strong> ${s}</p>
      <p><strong>Package batteries marked missing:</strong> ${missing}</p>
      <p><strong>Extra batteries:</strong> ${extra}</p>
      <p><strong>Package batteries marked present:</strong> ${packagePresent}</p>
      <p>Missing package batteries are deducted from the package valuation. Extra batteries are valued separately. Battery cycle deductions are applied to the supplied batteries.</p>
    `;
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const s9 = button.closest('.wizard-step[data-step="9"]');
    if (!s9 || !button.classList.contains("btn-next")) return;

    const batterySelects = $$('.package-content-select[data-content-id^="battery-"]', s9);
    const e = expected();
    const s = supplied();
    const missing = batterySelects.filter(x => x.value === "missing").length;
    const present = batterySelects.filter(x => x.value === "present").length;

    if (batterySelects.length === e && (present !== s || missing !== e - s)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(`Battery package mismatch. The selected package contains ${e} battery${e === 1 ? "" : "ies"}, but Step 6 says ${s} package batter${s === 1 ? "y is" : "ies are"} being supplied. Please mark ${s} Present and ${e - s} Missing.`);
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
