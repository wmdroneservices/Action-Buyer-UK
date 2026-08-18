/* GearCashOut multi-item quote basket. Lets one customer combine several equipment items into one submission. */
(function () {
  "use strict";

  const KEY = "gearCashOutQuoteBasket";
  let basket = [];
  let currentCommitted = false;
  let resetting = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const step = n => $(`#quote-form .wizard-step[data-step="${n}"]`);

  function readBasket() {
    try {
      const raw = localStorage.getItem(KEY);
      basket = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(basket)) basket = [];
    } catch (e) { basket = []; }
  }

  function saveBasket() {
    try { localStorage.setItem(KEY, JSON.stringify(basket)); } catch (e) {}
  }

  function money(value) {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value) || 0);
  }

  function currentItem() {
    const result = step(12);
    const price = $(".quote-price", result);
    const model = $("#dji-model");
    const packageSelect = $("#package-select");
    const manufacturer = $("#gear-manufacturer");
    const category = $("#gear-category");
    const condition = $("input[name=\"condition\"]:checked");
    const amount = price ? Number(price.textContent.replace(/[^0-9.]/g, "")) : 0;

    return {
      category: category?.value || "Drone",
      manufacturer: manufacturer?.value || "DJI",
      model: model?.value || "",
      modelName: model?.selectedOptions?.[0]?.textContent || "Equipment",
      package: packageSelect?.value || "",
      packageName: packageSelect?.selectedOptions?.[0]?.textContent || "",
      condition: condition?.value || "",
      amount: Number.isFinite(amount) ? amount : 0,
      addedAt: new Date().toISOString()
    };
  }

  function totalWith(item) {
    return basket.reduce((sum, x) => sum + (Number(x.amount) || 0), 0) + (Number(item?.amount) || 0);
  }

  function renderBasket(item) {
    const result = step(12);
    if (!result) return;
    let box = $("#gear-basket-box", result);
    if (!box) {
      box = document.createElement("div");
      box.id = "gear-basket-box";
      box.className = "quote-basket-box";
      const summary = $("#quote-summary", result);
      if (summary) summary.insertAdjacentElement("afterend", box);
      else result.prepend(box);
    }

    const all = basket.concat(item ? [item] : []);
    box.innerHTML = `
      <h3>Your Quote</h3>
      <p>You can add more equipment before submitting your quote.</p>
      <ol class="quote-basket-list">
        ${all.map((x, i) => `<li><strong>${escapeHtml(x.modelName || "Equipment")}</strong>${x.packageName ? ` — ${escapeHtml(x.packageName)}` : ""}<span>${money(x.amount)}</span></li>`).join("")}
      </ol>
      <div class="quote-basket-total"><strong>Estimated total</strong><strong>${money(totalWith(item))}</strong></div>
      <div class="quote-basket-actions">
        <button type="button" class="btn btn-add-another-item">Add Another Item</button>
        <button type="button" class="btn btn-continue-basket">Continue with This Quote</button>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function clearForNewItem() {
    const form = $("#quote-form");
    if (!form) return;
    resetting = true;
    form.reset();
    $$("input[type=file]", form).forEach(input => { try { input.value = ""; } catch (e) {} });
    const extras = ["extra-battery-count", "extra-controller-count", "extra-hardcase-count", "extra-charger-count", "extra-hub-count", "extra-propeller-count", "extra-small-count"];
    extras.forEach(id => { const el = $("#" + id); if (el) el.value = "0"; });
    const cycles = $("#extra-battery-cycles");
    if (cycles) cycles.innerHTML = "";
    const manufacturer = $("#gear-manufacturer");
    if (manufacturer) { manufacturer.value = ""; manufacturer.disabled = true; }
    const category = $("#gear-category");
    if (category) category.value = "";
    const model = $("#dji-model");
    if (model) model.innerHTML = '<option value="">-- Select model --</option>';
    const packageSelect = $("#package-select");
    if (packageSelect) packageSelect.innerHTML = '<option value="">-- Select package --</option>';
    const contents = $("#package-contents-list");
    if (contents) contents.innerHTML = "";
    basket = basket.slice();
    saveBasket();
    currentCommitted = false;

    const back = () => {
      const visible = $$("#quote-form .wizard-step").find(s => !s.hidden);
      const n = visible ? Number(visible.dataset.step) : 1;
      if (n <= 1) {
        resetting = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const button = $(".btn-back", visible);
      if (button) {
        button.click();
        setTimeout(back, 30);
      } else {
        resetting = false;
      }
    };
    back();
  }

  function commitCurrent(item) {
    if (!item || !item.model) return;
    basket.push(item);
    saveBasket();
    currentCommitted = true;
  }

  function prepareSubmission() {
    const result = step(12);
    const item = currentItem();
    if (!item.model) return;
    if (!currentCommitted) commitCurrent(item);
    const total = basket.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    try {
      const raw = localStorage.getItem("wba_latest_quote");
      if (raw) {
        const saved = JSON.parse(raw);
        saved.quoteBasket = basket;
        saved.quoteItemCount = basket.length;
        saved.quoteAmount = total;
        saved.multiItemQuote = true;
        localStorage.setItem("wba_latest_quote", JSON.stringify(saved));
      }
      localStorage.setItem(KEY, JSON.stringify(basket));
    } catch (e) {}
    if (result) {
      const title = $("#quote-result-title", result);
      if (title) title.textContent = basket.length > 1 ? "Your Combined Instant Quote" : "Your Instant Quote";
    }
  }

  function init() {
    const form = $("#quote-form");
    if (!form) return;
    readBasket();

    const observer = new MutationObserver(() => {
      const result = step(12);
      if (!result || result.hidden || resetting) return;
      const item = currentItem();
      if (item.model) renderBasket(item);
    });
    observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || resetting) return;
      const result = step(12);
      if (!result || !result.contains(button)) return;

      if (button.classList.contains("btn-add-another-item")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const item = currentItem();
        if (item.model) commitCurrent(item);
        clearForNewItem();
        return;
      }

      if (button.classList.contains("btn-continue-basket")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        prepareSubmission();
        const original = $("#quote-result-action", result);
        if (original) original.click();
        return;
      }
    }, true);

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || resetting) return;
      const s = button.closest(".wizard-step");
      if (!s || Number(s.dataset.step) !== 13) return;
      setTimeout(() => {
        try {
          const raw = localStorage.getItem("wba_latest_quote");
          if (!raw) return;
          const saved = JSON.parse(raw);
          if (basket.length > 0) {
            saved.quoteBasket = basket;
            saved.quoteItemCount = basket.length;
            saved.quoteAmount = basket.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
            saved.multiItemQuote = basket.length > 1;
            localStorage.setItem("wba_latest_quote", JSON.stringify(saved));
          }
        } catch (e) {}
      }, 350);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
