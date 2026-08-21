/* Package flow fix.
   The old standalone Step 6 battery-entry page has been removed.
   Package battery quantity belongs to the selected package/package-contents
   logic, while additional batteries remain separate accessories.
*/
(function () {
  "use strict";

  const PACKAGE_BATTERIES = {
    "mini-5-pro|fly-more-rc-2": 3,
    "mini-4-pro|fly-more-rc-2": 3,
    "mini-4-pro|fly-more-rc-n2": 3,
    "mini-3-pro|fly-more-rc-n1": 3,
    "mini-3-pro|fly-more-dji-rc": 3,
    "mini-3|fly-more-rc-n1": 3,
    "mini-2|fly-more": 3,
    "neo|drone-only": 1,
    "neo|fly-more": 3,
    "neo-2|standard": 1,
    "neo-2|fly-more": 3,
    "flip|standard-rc-n3": 1,
    "flip|fly-more-rc-n3": 3,
    "flip|fly-more-rc-2": 3,
    "air|drone-only": 1,
    "air|standard": 1,
    "air|fly-more": 3,
    "air-2|drone-only": 1,
    "air-2|fly-more": 3,
    "air-2s|drone-only": 1,
    "air-2s|fly-more": 3,
    "air-3|drone-only": 1,
    "air-3|fly-more": 3,
    "air-3s|drone-only": 1,
    "air-3s|fly-more": 3,
    "mavic-2-pro|drone-only": 1,
    "mavic-2-pro|standard": 1,
    "mavic-2-pro|fly-more": 3,
    "mavic-2-zoom|drone-only": 1,
    "mavic-2-zoom|fly-more": 3,
    "mavic-3|drone-only": 1,
    "mavic-3|fly-more": 3,
    "mavic-3-classic|drone-only": 1,
    "mavic-3-classic|fly-more": 3,
    "mavic-3-pro|drone-only": 1,
    "mavic-3-pro|fly-more": 3,
    "mavic-3-pro-cine|drone-only": 1,
    "mavic-3-pro-cine|premium-combo": 3,
    "mavic-4-pro|drone-only": 1,
    "mavic-4-pro|fly-more": 3,
    "fpv|drone-only": 1,
    "fpv|fly-smart": 1,
    "avata|drone-only": 1,
    "avata|fly-smart": 2,
    "avata|pro-view": 2,
    "avata|explorer": 2,
    "avata-2|drone-only": 1,
    "avata-2|fly-more": 3
  };

  function removeLegacyStep6(form) {
    const step6 = form.querySelector('.wizard-step[data-step="6"]');
    if (step6) step6.remove();

    const progress = document.getElementById("progress-indicator");
    if (progress) {
      progress.querySelectorAll(".progress-step").forEach(function (item) {
        const text = item.textContent.trim();
        if (/^6\./.test(text) || /package batteries/i.test(text)) item.remove();
      });
    }
  }

  function expectedPackageBatteries() {
    const model = document.getElementById("dji-model")?.value || "";
    const pkg = document.getElementById("package-select")?.value || "";
    return PACKAGE_BATTERIES[model + "|" + pkg] || 1;
  }

  window.gearExpectedPackageBatteries = expectedPackageBatteries;

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    if (!form) return;

    removeLegacyStep6(form);

    const observer = new MutationObserver(function () {
      removeLegacyStep6(form);
    });
    observer.observe(form, { childList: true, subtree: true });

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;

      const step = button.closest(".wizard-step");
      if (!step) return;
      const number = Number(step.dataset.step);

      /* Old quote.js used Step 6 as a battery page. With that page removed,
         Step 5 goes directly to Step 7 (Unbound Status). */
      if (button.classList.contains("btn-next") && number === 5) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const step7 = form.querySelector('.wizard-step[data-step="7"]');
        if (step7) {
          form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== step7; });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      if (button.classList.contains("btn-back") && number === 7) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const step5 = form.querySelector('.wizard-step[data-step="5"]');
        if (step5) {
          form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== step5; });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }, true);
  });
})();
