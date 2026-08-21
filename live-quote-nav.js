/* Live quote navigation and resume state.
   Shows a top-navigation link only while an unsubmitted quote basket exists,
   and restores the saved basket when the customer returns to quote.html. */
(function () {
  "use strict";

  const BASKET_KEY = "gearCashOutQuoteBasket";
  const NAV_ID = "live-quote-nav";
  let restoring = false;
  let restoreTimer = null;

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
    link.href = "quote.html?resume=1";
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

  function renderQuoteList() {
    if (typeof window.renderGearCashOutManualResult === "function") {
      window.renderGearCashOutManualResult();
      return;
    }
    const form = document.getElementById("quote-form");
    if (!form) return;
    const summary = document.getElementById("quote-summary");
    if (!summary) return;
    window.setTimeout(function () {
      if (typeof window.renderGearCashOutManualResult === "function") {
        window.renderGearCashOutManualResult();
      }
    }, 50);
  }

  function restoreLiveQuote() {
    if (!isQuotePage() || !readBasket().length) return;

    restoring = true;
    let attempts = 0;
    clearInterval(restoreTimer);

    restoreTimer = window.setInterval(function () {
      attempts += 1;

      if (!readBasket().length) {
        clearInterval(restoreTimer);
        restoring = false;
        return;
      }

      const restored = showStepDirect(12);
      if (restored) {
        renderQuoteList();
      }

      /* Keep trying briefly because the quote wizard has several compatibility
         scripts which can initialise Step 1 after the first render. */
      if (restored && attempts >= 30) {
        clearInterval(restoreTimer);
        restoring = false;
      } else if (attempts >= 50) {
        clearInterval(restoreTimer);
        restoring = false;
      }
    }, 100);
  }

  function stopRestoreOnUserInteraction() {
    if (!isQuotePage()) return;
    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !button.closest("#quote-form")) return;
      if (restoring) {
        restoring = false;
        clearInterval(restoreTimer);
      }
    }, true);
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

      window.setTimeout(function () {
        const submitted = form.querySelector('.wizard-step[data-step="14"]');
        if (submitted && !submitted.hidden) clearSubmittedBasket();
      }, 250);
    });
  }

  function init() {
    updateNavigation();
    watchSubmission();
    stopRestoreOnUserInteraction();
    restoreLiveQuote();

    window.addEventListener("storage", updateNavigation);
    window.addEventListener("gearCashOutBasketChanged", updateNavigation);
    window.addEventListener("pageshow", function () {
      updateNavigation();
      restoreLiveQuote();
    });

    window.setInterval(updateNavigation, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
