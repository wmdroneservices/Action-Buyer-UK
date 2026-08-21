/* DJI navigation compatibility fix. */
(function loadStartNavigationFix() {
  if (document.querySelector('script[data-quote-start-navigation-fix]')) return;
  const script = document.createElement("script");
  script.src = "quote-navigation-start-fix.js?v=20260820-3";
  script.async = false;
  script.dataset.quoteStartNavigationFix = "true";
  document.head.appendChild(script);
})();

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

  function setStep10Title() {
    const step10 = form.querySelector('[data-step="10"]');
    const heading = step10 && step10.querySelector("h3");
    if (heading) heading.textContent = "Step 10: Serial Numbers";
  }

  setStep10Title();

  /* Step 6 has been removed. Back from Step 7 therefore returns to Step 5. */
  form.addEventListener("click", function (event) {
    if (!isDJIDrone()) return;
    const button = event.target.closest("button");
    if (!button || !form.contains(button) || !button.classList.contains("btn-back")) return;
    const step = button.closest(".wizard-step");
    if (!step || Number(step.dataset.step) !== 7) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const step5 = form.querySelector('.wizard-step[data-step="5"]');
    if (step5) {
      form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== step5; });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, true);
});
