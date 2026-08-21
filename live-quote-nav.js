/* Live quote navigation and resume state.
   Shows a top-navigation link only while an unsubmitted quote basket exists,
   and restores the saved basket when the customer returns to quote.html. */
(function () {
  "use strict";

  const BASKET_KEY = "gearCashOutQuoteBasket";
  const NAV_ID = "live-quote-nav";

  function readBasket() {
    try {
      const value = JSON.parse(localStorage.getItem(BASKET_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function isQuotePage() {
    return /(^|\/)quote\.html$/i.test(window.location.pathname);
  }

  function updateNavigation() {
    const navList = document.querySelector("header .nav-list");
    if (!navList) return;

    const basket = readBasket();
    const existing = document.getElementById(NAV_ID);

    if (!basket.length) {
      if (existing) existing.remove();
      return;
    }

    const itemWord = basket.length === 1 ? "item" : "items";
    const label = "Your Quote (" + basket.length + " " + itemWord + ")";

    if (existing) {
      const link = existing.querySelector("a");
      if (link) link.textContent = label;
      return;
    }

    const li = document.createElement("li");
    li.id = NAV_ID;
    const link = document.createElement("a");
    link.href = "quote.html";
    link.textContent = label;
    link.setAttribute("aria-label", "Resume your saved quote with " + basket.length + " " + itemWord);
    li.appendChild(link);
    navList.appendChild(li);
  }

  function clearSubmittedBasket() {
    try { localStorage.removeItem(BASKET_KEY); } catch (_) {}
    window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged"));
    updateNavigation();
  }

  function showStepDirect(number) {
    const form = document.getElementById("quote-form");
    if (!form) return false;
    const target = form.querySelector('.wizard-step[data-step="' + number + '"]');
    if (!target) return false;
    form.querySelectorAll(".wizard-step").forEach(function (step) {
      step.hidden = step !== target;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function restoreLiveQuote() {
    if (!isQuotePage()) return;
    if (!readBasket().length) return;

    /* The core quote engine keeps showStep() private inside quote.js, so do
       not rely on window.showStep. Directly restore Step 12 instead. */
    function restore() {
      if (!readBasket().length) return;
      if (!showStepDirect(12)) {
        window.setTimeout(restore, 100);
        return;
      }
      window.setTimeout(function () {
        if (typeof window.renderGearCashOutManualResult === "function") {
          window.renderGearCashOutManualResult();
        }
      }, 50);
    }

    window.setTimeout(restore, 100);
  }

  function watchSubmission() {
    if (!isQuotePage()) return;
    const form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;
      const step = button.closest('.wizard-step[data-step="13"]');
      if (!step || !button.classList.contains("btn-next")) return;

      /* quote-account.js handles the actual save. Only clear the live basket
         after the UI has genuinely reached the submitted step. */
      window.setTimeout(function () {
        const submitted = form.querySelector('.wizard-step[data-step="14"]');
        if (submitted && !submitted.hidden) clearSubmittedBasket();
      }, 250);
    });
  }

  function init() {
    updateNavigation();
    watchSubmission();
    restoreLiveQuote();

    window.addEventListener("storage", updateNavigation);
    window.addEventListener("gearCashOutBasketChanged", updateNavigation);
    window.addEventListener("pageshow", updateNavigation);

    window.setInterval(updateNavigation, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
