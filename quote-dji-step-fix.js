document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  if (!form || !category || !manufacturer) return;

  function isDJIDrone() {
    return category.value === "drone" && String(manufacturer.value || "").toLowerCase() === "dji";
  }

  function showStepSafely(number) {
    if (typeof window.showStep === "function") {
      window.showStep(number);
      return;
    }
    form.querySelectorAll(".wizard-step").forEach(function (step) {
      step.hidden = Number(step.dataset.step) !== number;
    });
  }

  /*
   * The original quote.js and quote-flow-fix.js both attach click handlers.
   * This capture handler is deliberately registered on the form and only
   * owns DJI Step 3. It prevents the legacy handler from processing the
   * package button a second time.
   */
  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !form.contains(button) || !button.classList.contains("btn-next")) return;
    if (!isDJIDrone()) return;

    const visibleStep = Array.from(form.querySelectorAll(".wizard-step")).find(function (step) {
      return !step.hidden;
    });
    if (!visibleStep) return;

    const stepNumber = Number(visibleStep.dataset.step);
    if (stepNumber !== 3) return;

    const packageSelect = document.getElementById("package-select");
    if (!packageSelect || !packageSelect.value) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      alert("Please select the exact package.");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showStepSafely(4);
  }, true);
});
