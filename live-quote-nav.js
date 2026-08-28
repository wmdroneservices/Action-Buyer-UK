/* Live navigation for the current reverse-basket valuation system. */
(function () {
  "use strict";
  const BASKET_KEY = "gearCashOutQuoteBasket";
  const NAV_ID = "live-quote-nav";

  function clean(value) { return String(value || "").trim().toLowerCase(); }
  function isPlaceholder(value) { const text = clean(value); return !text || /^[-–—]/.test(text) || /\bselect\b.*\b(model|package|accessory|manufacturer)\b/.test(text); }
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
      if (valid.length !== value.length) localStorage.setItem(BASKET_KEY, JSON.stringify(valid));
      return valid;
    } catch (_) { return []; }
  }
  function isValuationPage() { return /(^|\/)valuation\.html$/i.test(window.location.pathname); }
  function removeNavigation() { document.getElementById(NAV_ID)?.remove(); }
  async function isStaff() {
    try {
      const auth = window.actionBuyerAuth;
      const session = await auth?.getSession();
      if (!session?.user?.id) return false;
      const { data } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
      return !!data;
    } catch (_) { return false; }
  }
  function loadCustomerTheme() {
    if (!document.getElementById("gear-cashout-customer-theme")) {
      const link = document.createElement("link");
      link.id = "gear-cashout-customer-theme";
      link.rel = "stylesheet";
      link.href = "customer.css?v=20260828-1";
      document.head.appendChild(link);
    }
    if (!document.getElementById("gear-cashout-customer-overrides")) {
      const link = document.createElement("link");
      link.id = "gear-cashout-customer-overrides";
      link.rel = "stylesheet";
      link.href = "customer-overrides.css?v=20260828-3";
      document.head.appendChild(link);
    }
    document.body.classList.add("customer-page");
  }
  function updateNavigation() {
    const navList = document.querySelector("header .nav-list");
    if (!navList) return;
    const basket = readBasket();
    if (!basket.length) { removeNavigation(); return; }
    const itemWord = basket.length === 1 ? "item" : "items";
    const label = `Your Quote (${basket.length} ${itemWord})`;
    let existing = document.getElementById(NAV_ID);
    if (!existing) { existing = document.createElement("li"); existing.id = NAV_ID; const link = document.createElement("a"); existing.appendChild(link); navList.appendChild(existing); }
    const link = existing.querySelector("a");
    link.href = "valuation.html";
    link.textContent = label;
    link.setAttribute("aria-label", `Resume your saved quote with ${basket.length} ${itemWord}`);
  }
  function clearSubmittedBasket() { try { localStorage.removeItem(BASKET_KEY); } catch (_) {} window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged")); updateNavigation(); }
  function watchSubmission() {
    if (!isValuationPage()) return;
    const form = document.getElementById("quote-form");
    if (!form) return;
    form.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;
      const step = button.closest('.wizard-step[data-step="9"]');
      if (!step || !button.classList.contains("btn-submit-valuation")) return;
      window.setTimeout(() => { const submitted = form.querySelector('.wizard-step[data-step="10"]'); if (submitted && !submitted.hidden) clearSubmittedBasket(); }, 250);
    }, true);
  }
  async function init() {
    removeNavigation();
    if (await isStaff()) return;
    loadCustomerTheme();
    watchSubmission();
    updateNavigation();
    window.addEventListener("storage", updateNavigation);
    window.addEventListener("gearCashOutBasketChanged", updateNavigation);
    window.setInterval(updateNavigation, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
