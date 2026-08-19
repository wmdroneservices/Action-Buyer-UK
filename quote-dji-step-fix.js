/* DJI navigation compatibility fix.
   The main quote engine owns navigation and its currentStep state.
   This file only hides the obsolete battery page and handles the one
   Back transition that must skip that hidden page. */
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

  function hideObsoleteBatteryStep() {
    const step6 = form.querySelector('[data-step="6"]');
    const progress6 = form.querySelector('.progress-step[data-step="6"]');
    if (step6) step6.hidden = true;
    if (progress6) progress6.hidden = true;
  }

  function setStep10Title() {
    const step10 = form.querySelector('[data-step="10"]');
    const heading = step10 && step10.querySelector("h3");
    if (heading) heading.textContent = "Step 10: Serial Numbers";
  }

  hideObsoleteBatteryStep();
  setStep10Title();

  form.addEventListener("click", function (event) {
    if (!isDJIDrone()) return;

    const button = event.target.closest("button");
    if (!button || !form.contains(button) || !button.classList.contains("btn-back")) return;

    const step = button.closest(".wizard-step");
    const stepNumber = step ? Number(step.dataset.step) : 0;

    /* Step 7 is immediately after the hidden Step 6. Let the normal
       Step 6 Back handler run so quote.js updates its internal currentStep
       correctly and returns to Step 5. */
    if (stepNumber === 7) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const step6 = form.querySelector('[data-step="6"]');
      const step6Back = step6 && step6.querySelector(".btn-back");
      if (step6Back) step6Back.click();
      else {
        /* Fallback: the main engine normally has Step 6 in its sequence. */
        const visible = form.querySelector('.wizard-step:not([hidden])');
        if (visible) visible.hidden = true;
        const step5 = form.querySelector('[data-step="5"]');
        if (step5) step5.hidden = false;
      }
      hideObsoleteBatteryStep();
      return;
    }

    /* All other navigation belongs to quote.js. */
  }, true);

  new MutationObserver(function () {
    if (isDJIDrone()) {
      hideObsoleteBatteryStep();
      setStep10Title();
    }
  }).observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
});
