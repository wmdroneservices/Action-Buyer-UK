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
    } else {
      form.querySelectorAll(".wizard-step").forEach(function (step) {
        step.hidden = Number(step.dataset.step) !== number;
      });
    }
  }

  function hideObsoleteBatteryStep() {
    const step6 = form.querySelector('[data-step="6"]');
    const progress6 = form.querySelector('.progress-step[data-step="6"]');
    if (step6) step6.hidden = true;
    if (progress6) progress6.hidden = true;
  }

  function setStep10Title() {
    const step10 = form.querySelector('[data-step="10"]');
    if (!step10) return;
    const heading = step10.querySelector("h3");
    if (heading) heading.textContent = "Step 10: Serial Numbers";
  }

  function currentStepNumber() {
    const visible = Array.from(form.querySelectorAll(".wizard-step")).find(function (step) {
      return !step.hidden;
    });
    return visible ? Number(visible.dataset.step) : 0;
  }

  function conditionSelected() {
    if (!form.querySelector('input[name="condition"]:checked')) {
      alert("Please select the condition.");
      return false;
    }
    return true;
  }

  function flightTimeEntered() {
    const hours = document.getElementById("flight-hours");
    const range = form.querySelector('input[name="flightHoursRange"]:checked');
    if ((!hours || !hours.value.trim()) && !range) {
      alert("Please enter the flight hours or select the flight time range.");
      return false;
    }
    return true;
  }

  hideObsoleteBatteryStep();
  setStep10Title();

  form.addEventListener("click", function (event) {
    if (!isDJIDrone()) return;

    const button = event.target.closest("button");
    if (!button || !form.contains(button)) return;

    const stepNumber = currentStepNumber();
    if (!stepNumber) return;

    /* The normal quote engine must remain responsible for Steps 1-4 and
       Steps 7-11 because it stores those answers in quoteData. We only
       intercept the broken navigation around the obsolete Step 6 battery
       page, plus Back buttons that would otherwise return to it. */

    if (button.classList.contains("btn-back")) {
      const previous = {
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        7: 5,
        8: 7,
        9: 8,
        10: 9,
        11: 10,
        12: 11
      }[stepNumber];

      if (previous) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        hideObsoleteBatteryStep();
        setStep10Title();
        showStepSafely(previous);
        return;
      }
    }

    if (!button.classList.contains("btn-next")) return;

    /* Step 4 must validate Condition and then use the existing quote engine
       to save quoteData.condition and move to Step 5. */
    if (stepNumber === 4) {
      if (!conditionSelected()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      return;
    }

    /* Step 5 is the only place where flight time is validated. Let the
       existing quote engine save the flight information, but immediately
       replace its obsolete Step 6 destination with Step 7. */
    if (stepNumber === 5) {
      if (!flightTimeEntered()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      window.setTimeout(function () {
        hideObsoleteBatteryStep();
        showStepSafely(7);
      }, 0);
      return;
    }

    /* If anything somehow reaches Step 6, never leave the user on the old
       battery page. */
    if (stepNumber === 6) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      hideObsoleteBatteryStep();
      showStepSafely(7);
      return;
    }

    /* Steps 7-11 are deliberately allowed through to quote.js so that its
       existing validators populate quoteData for the final valuation. */
  }, true);
});
