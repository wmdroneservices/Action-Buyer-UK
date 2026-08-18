document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");

  if (!form || !category || !manufacturer || !model) return;

  function getVisibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (step) {
      return !step.hidden;
    });
  }

  function goToStep(number) {
    const steps = Array.from(form.querySelectorAll(".wizard-step"));
    steps.forEach(function (step) {
      step.hidden = Number(step.dataset.step) !== number;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setLegacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "radio";
      hidden.name = "manufacturer";
      hidden.value = "dji";
      hidden.hidden = true;
      form.appendChild(hidden);
    }
    hidden.checked = true;
    hidden.dataset.selectedManufacturer = value;
  }

  function populateModelForSelectedEquipment() {
    const selectedOption = model.options[model.selectedIndex];
    const selectedModel = model.value;
    if (selectedModel) return;

    const catalogue = window.gearCatalogue;
    const data = catalogue && catalogue[category.value];
    const list = data && data[manufacturer.value];
    if (!list) return;

    model.innerHTML = '<option value="">-- Select a model --</option>';
    list.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];
      model.appendChild(option);
    });
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !button.classList.contains("btn-next")) return;

    const step = getVisibleStep();
    if (!step || Number(step.dataset.step) !== 1) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!category.value) {
      alert("Please select an equipment type.");
      return;
    }

    if (!manufacturer.value) {
      alert("Please select a manufacturer.");
      return;
    }

    setLegacyManufacturer(manufacturer.value);
    populateModelForSelectedEquipment();

    if (model.options.length <= 1) {
      alert("No models are currently available for this manufacturer.");
      return;
    }

    goToStep(2);
  }, true);
});
