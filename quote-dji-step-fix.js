/* DJI navigation compatibility fix.
   quote.js owns all normal navigation and currentStep state. */
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

  /* The only special Back transition is Step 7 -> Step 5. We deliberately
     invoke the real Step 6 Back button so quote.js updates currentStep. */
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
    if (step6Back) {
      step6Back.click();
    }
  }, true);
});
