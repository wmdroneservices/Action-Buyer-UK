function initGearCashOutResultFix() {
  const form = document.getElementById("quote-form");
  if (!form) return;

  window.renderGearCashOutManualResult = function () {
    const step = form.querySelector('[data-step="12"]');
    const summary = document.getElementById("quote-summary");
    if (!step || !summary) return;
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const model = document.getElementById("dji-model");
    if (!category || !manufacturer || !model) return;
    const selectedText = function (select) { return select && select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : ""; };
    const categoryName = selectedText(category) || category.value;
    const manufacturerName = selectedText(manufacturer) || manufacturer.value;
    const modelName = selectedText(model) || model.value;

    step.querySelectorAll("#quote-important, .quote-important, #quote-result-action, .btn-accept").forEach(function (el) { el.remove(); });
    const title = document.getElementById("quote-result-title");
    if (title) title.textContent = "Manual Valuation Required";

    let basket = [];
    try { basket = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]"); } catch (_) { basket = []; }
    if (!Array.isArray(basket)) basket = [];
    if (!basket.some(function (item) { return item.model === model.value && item.manufacturer === manufacturer.value; })) basket.push({ category: category.value, categoryName: categoryName, manufacturer: manufacturer.value, manufacturerName: manufacturerName, model: model.value, modelName: modelName, valuation: "manual", amount: null });

    const rows = basket.map(function (item, index) { return "<li><strong>" + (index + 1) + ". " + String(item.modelName || item.model) + "</strong><br><span>" + String(item.manufacturerName || item.manufacturer) + " — Manual valuation</span></li>"; }).join("");
    summary.innerHTML = `<div class="manual-valuation-box"><h3>Manual Valuation Required</h3><p><strong>Equipment:</strong> ${categoryName}</p><p><strong>Manufacturer:</strong> ${manufacturerName}</p><p><strong>Model:</strong> ${modelName}</p><p>We do not currently have a verified automatic purchase price for this equipment. Your information and photographs will be reviewed manually before a purchase valuation is confirmed.</p><p><strong>No £0 offer has been made.</strong></p></div><div class="quote-basket-preview"><h3>Your Quote</h3><p>You can add more equipment before submitting your quote.</p><ol>${rows}</ol><p><strong>Total:</strong> Manual valuation after review</p></div><div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;"><button type="button" class="btn" id="add-another-item">Add Another Item</button><button type="button" class="btn btn-accept" id="continue-with-quote">Continue with This Quote</button></div>`;
  };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGearCashOutResultFix);
else initGearCashOutResultFix();
