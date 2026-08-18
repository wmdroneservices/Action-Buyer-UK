document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!form || !category || !manufacturer || !model) return;

  function visibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (s) {
      return !s.hidden;
    });
  }

  function go(stepNo) {
    form.querySelectorAll(".wizard-step").forEach(function (s) {
      s.hidden = Number(s.dataset.step) !== stepNo;
    });
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
    hidden.dataset.selectedManufacturer = value;
  }

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !button.classList.contains("btn-next")) return;

    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    if (number === 1) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!category.value) return alert("Please select an equipment type.");
      if (!manufacturer.value) return alert("Please select a manufacturer.");

      const catalogue = window.gearCatalogue && window.gearCatalogue[category.value];
      if (!catalogue || !catalogue[manufacturer.value]) {
        return alert("This manufacturer is not currently available.");
      }

      legacyManufacturer(manufacturer.value);

      const list = catalogue[manufacturer.value];
      model.innerHTML = '<option value="">-- Select a model --</option>';
      list.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item[0];
        option.textContent = item[1];
        model.appendChild(option);
      });
      model.disabled = false;
      go(2);
      return;
    }

    if (number === 2) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!model.value) return alert("Please select a model.");

      if (category.value === "drone" && manufacturer.value === "DJI") {
        go(3);
      } else {
        // Non-DJI equipment does not enter the DJI package flow.
        go(4);
      }
      return;
    }

    // quote.js keeps its own currentStep index. Because this new equipment
    // flow controls the visible step directly, take ownership of the next
    // button for non-DJI equipment from this point onward as well.
    if (category.value !== "drone" || manufacturer.value !== "DJI") {
      if (number === 4) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const selected = form.querySelector('input[name="condition"]:checked');
        if (!selected) return alert("Please select the condition.");
        go(5);
        return;
      }

      if (number === 5) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        go(8);
        return;
      }

      if (number === 8) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        go(10);
        return;
      }
    }
  }, true);
});
