document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!form || !category || !manufacturer || !model) return;

  let manualResultRendered = false;

  function visibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (s) { return !s.hidden; });
  }
  function go(stepNo) {
    form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = Number(s.dataset.step) !== stepNo; });
    if (stepNo === 12 && isNonDJI()) renderManualResult();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function isDJIDrone() { return category.value === "drone" && manufacturer.value === "DJI"; }
  function isNonDJI() { return !isDJIDrone(); }
  function selectedText(select) {
    return select && select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : "";
  }
  function legacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "radio"; hidden.name = "manufacturer"; hidden.value = "dji"; hidden.hidden = true;
      form.appendChild(hidden);
    }
    hidden.checked = value === "DJI";
    hidden.dataset.selectedManufacturer = value;
  }
  function configureUsageStep() {
    const step = form.querySelector('[data-step="5"]');
    if (!step) return;
    const heading = step.querySelector("h3");
    const label = step.querySelector('label[for="flight-hours"]');
    const input = document.getElementById("flight-hours");
    const range = step.querySelector("fieldset");
    const usage = document.getElementById("gear-usage-count-wrap");
    if (category.value === "drone") {
      if (heading) heading.textContent = "Step 5: Flight Time";
      if (label) label.textContent = "Total flight hours completed";
      if (input) input.placeholder = "e.g. 4.2";
      if (range) range.hidden = false;
      if (usage) usage.hidden = true;
    } else {
      if (heading) heading.textContent = "Step 5: Usage Information";
      if (label) label.textContent = "Shutter / usage count, if known";
      if (input) input.placeholder = "Optional";
      if (range) range.hidden = true;
      if (usage) usage.hidden = false;
    }
  }
  function renderManualResult() {
    const step = form.querySelector('[data-step="12"]');
    const summary = document.getElementById("quote-summary");
    if (!step || !summary) return;
    const categoryName = selectedText(category) || category.value;
    const manufacturerName = selectedText(manufacturer) || manufacturer.value;
    const modelName = selectedText(model) || model.value;
    manualResultRendered = true;

    const title = document.getElementById("quote-result-title");
    const importantHeading = document.getElementById("quote-important-heading");
    const importantContent = document.getElementById("quote-important-content");
    if (title) title.textContent = "Manual Valuation Required";
    if (importantHeading) importantHeading.textContent = "MANUAL REVIEW";
    if (importantContent) importantContent.innerHTML = `
      <p>We do not currently have a verified automatic purchase price for this equipment.</p>
      <p>Your photographs and information will be reviewed manually before a purchase price is confirmed.</p>
      <p><strong>No £0 offer has been made.</strong></p>`;

    summary.innerHTML = `
      <div class="manual-valuation-box">
        <h3>Manual Valuation Required</h3>
        <p><strong>Equipment:</strong> ${escapeHTML(categoryName)}</p>
        <p><strong>Manufacturer:</strong> ${escapeHTML(manufacturerName)}</p>
        <p><strong>Model:</strong> ${escapeHTML(modelName)}</p>
        <p>We will manually assess the equipment, condition and photographs and then provide a purchase valuation.</p>
        <p><strong>This is not a £0 offer.</strong></p>
      </div>
      <div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">
        <button type="button" class="btn" id="add-another-item">Add Another Item</button>
        <button type="button" class="btn" id="continue-with-quote">Continue with This Quote</button>
      </div>`;

    const oldAction = document.getElementById("quote-result-action") || step.querySelector(".btn-accept");
    if (oldAction) oldAction.hidden = true;
  }
  function saveCurrentItem() {
    const key = "gearCashOutQuoteBasket";
    let basket = [];
    try { basket = JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { basket = []; }
    basket.push({ category: category.value, categoryName: selectedText(category), manufacturer: manufacturer.value, manufacturerName: selectedText(manufacturer), model: model.value, modelName: selectedText(model), valuation: "manual", amount: null });
    localStorage.setItem(key, JSON.stringify(basket));
  }
  function addAnotherItem() {
    saveCurrentItem();
    form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = true; });
    const first = form.querySelector('[data-step="1"]');
    if (first) first.hidden = false;
    category.value = "";
    manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>';
    manufacturer.disabled = true;
    model.innerHTML = '<option value="">-- Select a model --</option>';
    manualResultRendered = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueWithQuote() {
    saveCurrentItem();
    go(13);
  }

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    if (number === 12 && isNonDJI()) {
      if (button.id === "add-another-item") {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        addAnotherItem(); return;
      }
      if (button.id === "continue-with-quote" || button.id === "quote-result-action" || button.classList.contains("btn-accept")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        continueWithQuote(); return;
      }
    }

    if (button.classList.contains("btn-back") && isNonDJI()) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const previous = ({4:2, 5:4, 8:5, 10:8, 11:10, 12:11, 13:12})[number];
      if (previous) go(previous);
      return;
    }
    if (!button.classList.contains("btn-next")) return;

    if (number === 1) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!category.value) return alert("Please select an equipment type.");
      if (!manufacturer.value) return alert("Please select a manufacturer.");
      const catalogue = window.gearCatalogue && window.gearCatalogue[category.value];
      if (!catalogue || !catalogue[manufacturer.value]) return alert("This manufacturer is not currently available.");
      legacyManufacturer(manufacturer.value);
      model.innerHTML = '<option value="">-- Select a model --</option>';
      catalogue[manufacturer.value].forEach(function (item) {
        const option = document.createElement("option"); option.value = item[0]; option.textContent = item[1]; model.appendChild(option);
      });
      model.disabled = false; configureUsageStep(); go(2); return;
    }
    if (number === 2) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (!model.value) return alert("Please select a model.");
      configureUsageStep(); go(isDJIDrone() ? 3 : 4); return;
    }
    if (isNonDJI()) {
      if (number === 4) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="condition"]:checked')) return alert("Please select the condition.");
        go(5); return;
      }
      if (number === 5) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); go(8); return; }
      if (number === 8) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="damage"]:checked')) return alert("Please select Yes or No for damage.");
        go(10); return;
      }
      if (number === 10) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); go(11); return; }
      if (number === 11) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        const photos = document.getElementById("photo-uploads");
        if (!photos || !photos.files || photos.files.length === 0) return alert("Please upload at least one photograph before continuing.");
        go(12); return;
      }
    }
  }

  form.addEventListener("click", handleClick, true);

  category.addEventListener("change", function () {
    manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>';
    manufacturer.disabled = true;
    model.innerHTML = '<option value="">-- Select a model --</option>';
    if (window.gearCatalogue && window.gearCatalogue[category.value]) {
      Object.keys(window.gearCatalogue[category.value]).forEach(function (key) {
        const option = document.createElement("option"); option.value = key; option.textContent = key; manufacturer.appendChild(option);
      });
      manufacturer.disabled = false;
    }
    configureUsageStep();
  });

  const resultStep = form.querySelector('[data-step="12"]');
  if (resultStep) {
    const observer = new MutationObserver(function () {
      if (!resultStep.hidden && isNonDJI()) {
        manualResultRendered = false;
        renderManualResult();
      }
    });
    observer.observe(resultStep, { childList: true, subtree: true });
  }
});
