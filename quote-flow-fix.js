document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!form || !category || !manufacturer || !model) return;

  function visibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (s) { return !s.hidden; });
  }
  function go(stepNo) {
    form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = Number(s.dataset.step) !== stepNo; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function isDJIDrone() { return category.value === "drone" && manufacturer.value === "DJI"; }
  function isNonDJI() { return !isDJIDrone(); }
  function legacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "radio"; hidden.name = "manufacturer"; hidden.value = "dji"; hidden.hidden = true;
      form.appendChild(hidden);
    }
    hidden.checked = value === "DJI";
    hidden.dataset.selectedManufacturer = value;
  }
  function configureUsageStep() {
    const step = form.querySelector('[data-step="5"]');
    if (!step) return;
    const heading = step.querySelector("h3");
    const flightLabel = step.querySelector('label[for="flight-hours"]');
    const flightInput = document.getElementById("flight-hours");
    const flightRange = step.querySelector('fieldset');
    const usageWrap = document.getElementById("gear-usage-count-wrap");
    if (category.value === "drone") {
      if (heading) heading.textContent = "Step 5: Flight Time";
      if (flightLabel) flightLabel.textContent = "Total flight hours completed";
      if (flightInput) flightInput.placeholder = "e.g. 4.2";
      if (flightRange) flightRange.hidden = false;
      if (usageWrap) usageWrap.hidden = true;
    } else {
      if (heading) heading.textContent = "Step 5: Usage Information";
      if (flightLabel) flightLabel.textContent = "Shutter / usage count, if known";
      if (flightInput) flightInput.placeholder = "Optional";
      if (flightRange) flightRange.hidden = true;
      if (usageWrap) usageWrap.hidden = false;
    }
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    if (button.classList.contains("btn-back") && isNonDJI()) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const previous = ({4:2, 5:4, 8:5, 10:8, 11:10, 12:11})[number];
      if (previous) go(previous);
      return;
    }

    if (!button.classList.contains("btn-next")) return;

    if (number === 1) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!category.value) return alert("Please select an equipment type.");
      if (!manufacturer.value) return alert("Please select a manufacturer.");
      const catalogue = window.gearCatalogue && window.gearCatalogue[category.value];
      if (!catalogue || !catalogue[manufacturer.value]) return alert("This manufacturer is not currently available.");
      legacyManufacturer(manufacturer.value);
      model.innerHTML = '<option value="">-- Select a model --</option>';
      catalogue[manufacturer.value].forEach(function (item) {
        const option = document.createElement("option");
        option.value = item[0]; option.textContent = item[1]; model.appendChild(option);
      });
      model.disabled = false; configureUsageStep(); go(2); return;
    }
    if (number === 2) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!model.value) return alert("Please select a model.");
      configureUsageStep(); go(isDJIDrone() ? 3 : 4); return;
    }
    if (isNonDJI()) {
      if (number === 4) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="condition"]:checked')) return alert("Please select the condition.");
        go(5); return;
      }
      if (number === 5) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); go(8); return;
      }
      if (number === 8) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="damage"]:checked')) return alert("Please select Yes or No for damage.");
        go(10); return;
      }
      if (number === 10) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); go(11); return;
      }
      if (number === 11) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); go(12); return;
      }
    }
  }, true);
});
