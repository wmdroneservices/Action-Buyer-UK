/* DJI navigation compatibility fix.
   quote.js owns normal navigation and currentStep state.
   Step 6 is intentionally kept visible because package batteries are part of
   the valuation workflow. This file also loads the start-of-wizard fix early
   so its document-level capture handler runs before the older form handlers.
*/
(function loadStartNavigationFix() {
  if (document.querySelector('script[data-quote-start-navigation-fix]')) return;
  const script = document.createElement("script");
  script.src = "quote-navigation-start-fix.js";
  script.async = false;
  script.dataset.quoteStartNavigationFix = "true";
  document.head.appendChild(script);
})();

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  if (!form || !category || !manufacturer) return;

  function isDJIDrone() {
    return String(category.value || "").toLowerCase() === "drone" &&
           String(manufacturer.value || "").toLowerCase() === "dji";
  }

  function setStep10Title() {
    const step10 = form.querySelector('[data-step="10"]');
    const heading = step10 && step10.querySelector("h3");
    if (heading) heading.textContent = "Step 10: Serial Numbers";
  }

  setStep10Title();

  form.addEventListener("click", function (event) {
    if (!isDJIDrone()) return;

    const button = event.target.closest("button");
    if (!button || !form.contains(button) || !button.classList.contains("btn-back")) return;

    const step = button.closest(".wizard-step");
    if (!step || Number(step.dataset.step) !== 7) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const step6 = form.querySelector('[data-step="6"]');
    const step6Back = step6 && step6.querySelector(".btn-back");
    if (step6Back) step6Back.click();
  }, true);

  function loadConsistency() {
    if (document.querySelector('script[data-dji-battery-consistency-fix]')) return;
    const script = document.createElement("script");
    script.src = "quote-battery-consistency-fix.js";
    script.defer = true;
    script.dataset.djiBatteryConsistencyFix = "true";
    document.head.appendChild(script);
  }

  if (document.querySelector('script[data-dji-battery-fix]')) {
    loadConsistency();
  } else {
    const script = document.createElement("script");
    script.src = "quote-battery-fix.js";
    script.defer = true;
    script.dataset.djiBatteryFix = "true";
    script.onload = loadConsistency;
    document.head.appendChild(script);
  }
});
