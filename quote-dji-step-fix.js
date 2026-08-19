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
    if (step6) step6.hidden = true;
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

  function validateCondition() {
    if (!form.querySelector('input[name="condition"]:checked')) {
      alert("Please select the condition.");
      return false;
    }
    return true;
  }

  function validateFlightTime() {
    const hours = document.getElementById("flight-hours");
    const range = form.querySelector('input[name="flightHoursRange"]:checked');
    if ((!hours || !hours.value.trim()) && !range) {
      alert("Please enter the flight hours or select the flight time range.");
      return false;
    }
    return true;
  }

  function validateUnbound() {
    if (!form.querySelector('input[name="unbound"]:checked')) {
      alert("Please select the drone account status.");
      return false;
    }
    return true;
  }

  function validateDamage() {
    if (!form.querySelector('input[name="damage"]:checked')) {
      alert("Please select Yes or No for damage.");
      return false;
    }
    return true;
  }

  function validateSerial() {
    const equipment = document.getElementById("drone-serial-number");
    if (!equipment || !equipment.value.trim()) {
      alert("Please enter the equipment serial number.");
      return false;
    }
    return true;
  }

  function validatePhotos() {
    const photos = document.getElementById("photo-uploads");
    if (!photos || !photos.files || photos.files.length === 0) {
      alert("Please upload at least one photograph before continuing.");
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

    /* DJI now uses:
       1 Equipment/Manufacturer
       2 Model
       3 Exact Package
       4 Condition
       5 Flight Time
       7 Unbound
       8 Damage
       9 Package Contents
       10 Serial Numbers
       11 Photos
       12 Quote Result

       Step 6 is the obsolete separate battery page and is deliberately skipped.
       Batteries included in the selected package are dealt with in Package
       Contents; genuinely additional batteries are dealt with in Step 10. */

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

    if (stepNumber === 3) {
      const packageSelect = document.getElementById("package-select");
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!packageSelect || !packageSelect.value) {
        alert("Please select the exact package.");
        return;
      }
      showStepSafely(4);
      return;
    }

    if (stepNumber === 4) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateCondition()) return;
      showStepSafely(5);
      return;
    }

    if (stepNumber === 5) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateFlightTime()) return;
      hideObsoleteBatteryStep();
      showStepSafely(7);
      return;
    }

    if (stepNumber === 7) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateUnbound()) return;
      showStepSafely(8);
      return;
    }

    if (stepNumber === 8) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateDamage()) return;
      showStepSafely(9);
      return;
    }

    if (stepNumber === 9) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showStepSafely(10);
      setStep10Title();
      return;
    }

    if (stepNumber === 10) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateSerial()) return;
      showStepSafely(11);
      return;
    }

    if (stepNumber === 11) {
      /* Keep the existing quote engine responsible for calculating the final
         result. We only block the click when photographs are missing. */
      if (!validatePhotos()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }
  }, true);
});
