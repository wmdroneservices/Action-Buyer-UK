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
  function legacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "radio";
      hidden.name = "manufacturer";
      hidden.value = "dji";
      hidden.hidden = true;
      form.appendChild(hidden);
    }
    hidden.checked = value === "DJI";
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !button.classList.contains("btn-next")) return;
    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    if (number === 1) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!category.value) return alert("Please select an equipment type.");
      if (!manufacturer.value) return alert("Please select a manufacturer.");
      if (!window.gearCatalogue || !window.gearCatalogue[category.value] || !window.gearCatalogue[category.value][manufacturer.value]) return alert("This manufacturer is not currently available.");
      legacyManufacturer(manufacturer.value);
      if (!model.value) {
        const list = window.gearCatalogue[category.value][manufacturer.value];
        model.innerHTML = '<option value="">-- Select a model --</option>';
        list.forEach(function (item) { const o = document.createElement("option"); o.value = item[0]; o.textContent = item[1]; model.appendChild(o); });
      }
      go(2);
      return;
    }

    if (number === 2) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!model.value) return alert("Please select a model.");
      // DJI continues into the existing DJI package/valuation flow.
      if (category.value === "drone" && manufacturer.value === "DJI") {
        go(3);
        return;
      }
      // Other equipment does not get forced through DJI package selection.
      // Continue to the generic condition step; later category-specific fields can be added without changing the manufacturer/model logic.
      go(4);
    }
  }, true);
});
