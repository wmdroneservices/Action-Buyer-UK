/* Live quote navigation and resume state.
   Shows a top-navigation link only while an unsubmitted quote basket exists for a customer,
   and restores the saved basket when the customer returns to quote.html. Staff accounts
   never see or restore the customer quote basket. */
(function () {
  "use strict";

  const BASKET_KEY = "gearCashOutQuoteBasket";
  const NAV_ID = "live-quote-nav";
  let restoring = false;
  let restoreTimer = null;
  let roleKnown = false;
  let isStaff = false;

  function clean(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isPlaceholder(value) {
    const text = clean(value);
    return !text || /^[-–—]/.test(text) || /\bselect\b.*\b(model|package|accessory|manufacturer)\b/.test(text);
  }

  function isCompleteItem(item) {
    if (!item || typeof item !== "object") return false;
    if (isPlaceholder(item.category) || isPlaceholder(item.categoryName)) return false;
    if (isPlaceholder(item.manufacturer) || isPlaceholder(item.manufacturerName)) return false;
    if (isPlaceholder(item.model) || isPlaceholder(item.modelName)) return false;
    if (item.category === "drone" && (isPlaceholder(item.package) || isPlaceholder(item.packageName))) return false;
    return true;
  }

  function readBasket() {
    try {
      const value = JSON.parse(localStorage.getItem(BASKET_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      const valid = value.filter(isCompleteItem);
      if (valid.length !== value.length) {
        localStorage.setItem(BASKET_KEY, JSON.stringify(valid));
        window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged"));
      }
      return valid;
    } catch (_) {
      return [];
    }
  }

  function isQuotePage() {
    return /(^|\/)quote\.html$/i.test(window.location.pathname);
  }

  function removeNavigation() {
    const existing = document.getElementById(NAV_ID);
    if (existing) existing.remove();
  }

  async function detectRole() {
    roleKnown = false;
    isStaff = false;
    try {
      const auth = window.actionBuyerAuth;
      if (!auth) {
        roleKnown = true;
        return;
      }
      const session = await auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await auth.supabase
          .from("staff_users")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (error) console.error("Staff role check failed", error);
        isStaff = !!data;
      }
    } catch (error) {
      console.error("Quote navigation role check failed", error);
    } finally {
      roleKnown = true;
      updateNavigation();
    }
  }

  function updateNavigation() {
    const navList = document.querySelector("header .nav-list");
    if (!navList) return;
    if (!roleKnown || isStaff) {
      removeNavigation();
      return;
    }

    const basket = readBasket();
    const existing = document.getElementById(NAV_ID);
    if (!basket.length) {
      removeNavigation();
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
    if (target.hidden) {
      form.querySelectorAll(".wizard-step").forEach(function (step) {
        step.hidden = step !== target;
      });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    return true;
  }

  function renderQuoteList() {
    if (typeof window.renderGearCashOutManualResult === "function") {
      window.renderGearCashOutManualResult();
      return true;
    }
    const summary = document.getElementById("quote-summary");
    if (!summary) return false;
    return false;
  }

  function restoreLiveQuote() {
    if (isStaff || !roleKnown || !isQuotePage() || !readBasket().length) return;
    restoring = true;
    let attempts = 0;
    clearInterval(restoreTimer);
    restoreTimer = window.setInterval(function () {
      attempts += 1;
      if (isStaff || !roleKnown || !readBasket().length) {
        clearInterval(restoreTimer);
        restoring = false;
        return;
      }
      const restored = showStepDirect(12);
      const rendered = restored && renderQuoteList();
      if (rendered || attempts >= 30) {
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

  async function init() {
    removeNavigation();
    watchSubmission();
    stopRestoreOnUserInteraction();
    window.addEventListener("storage", updateNavigation);
    window.addEventListener("gearCashOutBasketChanged", updateNavigation);
    window.addEventListener("pageshow", async function () {
      await detectRole();
      updateNavigation();
      restoreLiveQuote();
    });
    if (window.actionBuyerAuth?.supabase) {
      window.actionBuyerAuth.supabase.auth.onAuthStateChange(async function () {
        await detectRole();
        updateNavigation();
        restoreLiveQuote();
      });
    }
    await detectRole();
    updateNavigation();
    restoreLiveQuote();
    window.setInterval(updateNavigation, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
