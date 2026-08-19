/* Prevent the legacy DJI package handler from validating Step 3 twice. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  if (!form || !category || !manufacturer) return;

  form.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button || !form.contains(button)) return;
    const step = button.closest('.wizard-step[data-step="3"]');
    if (!step || !button.classList.contains("btn-next")) return;
    if (category.value !== "drone" || manufacturer.value !== "DJI") return;

    const packageSelect = document.getElementById("package-select");
    if (!packageSelect || !packageSelect.value) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("Please select the exact package.");
      return;
    }

    /* Step 3 has already been completed. Do not allow the legacy quote.js
       handler to run a second package validation or rebuild the package step. */
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof window.showStep === "function") {
      window.showStep(4);
    } else {
      form.querySelectorAll(".wizard-step").forEach(function (s) {
        s.hidden = Number(s.dataset.step) !== 4;
      });
    }
  }, true);
});
