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

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !form.contains(button) || !button.classList.contains("btn-next")) return;
    if (!isDJIDrone()) return;

    const visibleStep = Array.from(form.querySelectorAll(".wizard-step")).find(function (step) {
      return !step.hidden;
    });
    if (!visibleStep) return;
    const stepNumber = Number(visibleStep.dataset.step);

    /* Step 3: package is selected once, then go straight to Condition. */
    if (stepNumber === 3) {
      const packageSelect = document.getElementById("package-select");
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!packageSelect || !packageSelect.value) {
        alert("Please select the exact package.");
        return;
      }
      showStepSafely(4);
      return;
    }

    /* Step 4: validate Condition here. Never let the old flight-time
       validator handle this button. */
    if (stepNumber === 4) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!form.querySelector('input[name="condition"]:checked')) {
        alert("Please select the condition.");
        return;
      }
      showStepSafely(5);
      return;
    }

    /* Step 5: flight time belongs here, not on Condition. */
    if (stepNumber === 5) {
      const hours = document.getElementById("flight-hours");
      const range = form.querySelector('input[name="flightHoursRange"]:checked');
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if ((!hours || !hours.value.trim()) && !range) {
        alert("Please enter the flight hours or select the flight time range.");
        return;
      }
      showStepSafely(6);
    }
  }, true);
});
