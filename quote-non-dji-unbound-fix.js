/* Skip the DJI account-binding question for non-DJI equipment. */
(function () {
  "use strict";

  function isDJI() {
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const categoryValue = String(category && category.value || "").toLowerCase();
    const manufacturerValue = String(manufacturer && manufacturer.value || "").toLowerCase();
    return categoryValue === "dji-controller" || categoryValue === "dji-battery" || manufacturerValue === "dji";
  }

  function hideProgressForNonDJI() {
    const progress = document.getElementById("progress-indicator");
    if (!progress) return;
    Array.from(progress.children).forEach(function (item) {
      const text = String(item.textContent || "").trim();
      if (/^7\./.test(text) && !isDJI()) item.hidden = true;
      else if (/^7\./.test(text)) item.hidden = false;
    });
  }

  function skipVisibleUnboundStep() {
    if (isDJI()) return;
    const step = document.querySelector('.wizard-step[data-step="7"]');
    if (!step || step.hidden) return;

    /* quote.js owns the wizard's internal currentStep value. Let its normal
       Step 7 handler advance that value, but supply a neutral answer so the
       handler can complete without showing the DJI question to the customer. */
    const neutral = step.querySelector('input[name="unbound"][value="unknown"]');
    if (neutral) neutral.checked = true;

    const next = step.querySelector(".btn-next");
    if (next && !step.dataset.autoSkipped) {
      step.dataset.autoSkipped = "1";
      setTimeout(function () {
        next.click();
        setTimeout(function () {
          step.hidden = true;
          hideProgressForNonDJI();
        }, 0);
      }, 0);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    hideProgressForNonDJI();

    ["gear-category", "gear-manufacturer", "dji-model"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", function () {
        const step = document.querySelector('.wizard-step[data-step="7"]');
        if (step) delete step.dataset.autoSkipped;
        hideProgressForNonDJI();
      });
    });

    const form = document.getElementById("quote-form");
    if (!form) return;

    const observer = new MutationObserver(function () {
      hideProgressForNonDJI();
      skipVisibleUnboundStep();
    });
    observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
  });
})();

/* Load the live-quote navigation on the valuation page without altering the
   existing quote wizard script order. */
(function () {
  const script = document.createElement("script");
  script.src = "live-quote-nav.js?v=20260821-1";
  script.defer = true;
  document.head.appendChild(script);
})();
