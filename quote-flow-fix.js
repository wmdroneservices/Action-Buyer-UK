document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!form || !category || !manufacturer || !model) return;

  function visibleStep() {
    return Array.from(form.querySelectorAll(".wizard-step")).find(function (s) { return !s.hidden; });
  }

  function go(stepNo) {
    if (typeof showStep === "function") {
      showStep(stepNo);
    } else {
      form.querySelectorAll(".wizard-step").forEach(function (s) {
        s.hidden = Number(s.dataset.step) !== stepNo;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function isDJIDrone() {
    return category.value === "drone" && manufacturer.value === "DJI";
  }

  function isNonDJI() {
    return !isDJIDrone();
  }

  function selectedText(select) {
    return select && select.options && select.selectedIndex >= 0
      ? select.options[select.selectedIndex].textContent.trim()
      : "";
  }

  function legacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "radio";
      hidden.name = "manufacturer";
      hidden.value = "dji";
      hidden.hidden = true;
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

  function getBasket() {
    try {
      const value = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveCurrentItem() {
    const basket = getBasket();
    const item = {
      category: category.value,
      categoryName: selectedText(category),
      manufacturer: manufacturer.value,
      manufacturerName: selectedText(manufacturer),
      model: model.value,
      modelName: selectedText(model),
      valuation: "manual",
      amount: null
    };
    const duplicate = basket.some(function (existing) {
      return existing.category === item.category &&
        existing.manufacturer === item.manufacturer &&
        existing.model === item.model;
    });
    if (!duplicate) basket.push(item);
    localStorage.setItem("gearCashOutQuoteBasket", JSON.stringify(basket));
    return basket;
  }

  function clearCurrentItemFields() {
    category.value = "";
    manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>';
    manufacturer.disabled = true;
    model.innerHTML = '<option value="">-- Select a model --</option>';
    model.disabled = true;
    form.querySelectorAll('input[name="condition"], input[name="damage"], input[name="legalRight"]').forEach(function (input) {
      input.checked = false;
    });
    const photos = document.getElementById("photo-uploads");
    if (photos) photos.value = "";
  }

  function addAnotherItem() {
    saveCurrentItem();
    clearCurrentItemFields();
    go(1);
  }

  function renderManualResult() {
    const step = form.querySelector('[data-step="12"]');
    const summary = document.getElementById("quote-summary");
    if (!step || !summary) return;

    const categoryName = selectedText(category) || category.value;
    const manufacturerName = selectedText(manufacturer) || manufacturer.value;
    const modelName = selectedText(model) || model.value;
    const basket = getBasket();

    step.querySelectorAll("#quote-result-action, .btn-accept, #quote-important, .quote-important").forEach(function (el) {
      el.remove();
    });

    const title = document.getElementById("quote-result-title");
    if (title) title.textContent = "Manual Valuation Required";

    const items = basket.slice();
    const currentAlreadySaved = items.some(function (item) {
      return item.category === category.value && item.manufacturer === manufacturer.value && item.model === model.value;
    });
    if (!currentAlreadySaved) {
      items.push({
        category: category.value,
        categoryName: categoryName,
        manufacturer: manufacturer.value,
        manufacturerName: manufacturerName,
        model: model.value,
        modelName: modelName,
        valuation: "manual",
        amount: null
      });
    }

    const itemRows = items.map(function (item, index) {
      return `<li><strong>${index + 1}. ${escapeHTML(item.modelName || item.model)}</strong><br><span>${escapeHTML(item.manufacturerName || item.manufacturer)} — Manual valuation</span></li>`;
    }).join("");

    summary.innerHTML = `
      <div class="manual-valuation-box">
        <h3>Manual Valuation Required</h3>
        <p><strong>Current item:</strong> ${escapeHTML(categoryName)} — ${escapeHTML(manufacturerName)} — ${escapeHTML(modelName)}</p>
        <p>We do not currently have a verified automatic purchase price for this equipment.</p>
        <p>Your information and photographs will be reviewed manually before a purchase valuation is confirmed.</p>
        <p><strong>No £0 offer has been made.</strong></p>
      </div>
      <div class="quote-basket-preview">
        <h3>Your Quote</h3>
        <p>You can add more equipment before submitting your quote.</p>
        <ol>${itemRows}</ol>
        <p><strong>Total:</strong> Manual valuation after review</p>
      </div>
      <div class="manual-quote-actions" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">
        <button type="button" class="btn" id="add-another-item">Add Another Item</button>
        <button type="button" class="btn btn-accept" id="continue-with-quote">Continue with This Quote</button>
      </div>`;
  }

  function continueWithQuote() {
    saveCurrentItem();
    go(13);
  }

  function validateManualCustomerDetails() {
    const name = document.getElementById("full-name");
    const email = document.getElementById("email-address");
    const phone = document.getElementById("phone-number");
    if (!name || !name.value.trim()) return alert("Please enter your full name.");
    if (!email || !email.value.trim()) return alert("Please enter your email address.");
    if (!phone || !phone.value.trim()) return alert("Please enter your telephone number.");
    return true;
  }

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button || !form.contains(button)) return;
    const step = visibleStep();
    if (!step) return;
    const number = Number(step.dataset.step);

    /* Explicit navigation for every affected wizard step.
       This capture handler runs before the legacy quote handler so that
       Back/Next cannot be swallowed by the older renderer. */
    if (button.classList.contains("btn-back")) {
      const previous = {
        2: 1,
        3: 2,
        4: 2,
        5: 4,
        6: 5,
        7: 6,
        8: 5,
        9: 8,
        10: 9,
        11: 10,
        12: 11,
        13: 12,
        14: 13,
        15: 14,
        16: 15
      }[number];

      if (previous) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        go(previous);
        return;
      }
    }

    if (number === 11 && button.classList.contains("btn-next")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const photos = document.getElementById("photo-uploads");
      if (!photos || !photos.files || photos.files.length === 0) {
        alert("Please upload at least one photograph before continuing.");
        return;
      }
      go(12);
      return;
    }

    if (number === 12 && isNonDJI()) {
      if (button.id === "add-another-item") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        addAnotherItem();
        return;
      }
      if (button.id === "continue-with-quote") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        continueWithQuote();
        return;
      }
    }

    if (number === 13 && isNonDJI() && button.classList.contains("btn-next")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!validateManualCustomerDetails()) return;
      go(14);
      return;
    }

    if (!button.classList.contains("btn-next")) return;

    if (number === 1) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!category.value) return alert("Please select an equipment type.");
      if (!manufacturer.value) return alert("Please select a manufacturer.");
      const catalogue = window.gearCatalogue && window.gearCatalogue[category.value];
      if (!catalogue || !catalogue[manufacturer.value]) return alert("This manufacturer is not currently available.");
      legacyManufacturer(manufacturer.value);
      model.innerHTML = '<option value="">-- Select a model --</option>';
      catalogue[manufacturer.value].forEach(function (item) {
        const option = document.createElement("option");
        option.value = item[0];
        option.textContent = item[1];
        model.appendChild(option);
      });
      model.disabled = false;
      configureUsageStep();
      go(2);
      return;
    }

    if (number === 2) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!model.value) return alert("Please select a model.");
      configureUsageStep();
      go(isDJIDrone() ? 3 : 4);
      return;
    }

    if (isNonDJI()) {
      if (number === 4) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="condition"]:checked')) return alert("Please select the condition.");
        go(5); return;
      }
      if (number === 5) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        go(8); return;
      }
      if (number === 8) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!form.querySelector('input[name="damage"]:checked')) return alert("Please select Yes or No for damage.");
        go(10); return;
      }
      if (number === 10) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        go(11); return;
      }
    }
  }

  form.addEventListener("click", handleClick, true);

  category.addEventListener("change", function () {
    manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>';
    manufacturer.disabled = true;
    model.innerHTML = '<option value="">-- Select a model --</option>';
    model.disabled = true;
    if (window.gearCatalogue && window.gearCatalogue[category.value]) {
      Object.keys(window.gearCatalogue[category.value]).forEach(function (key) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;
        manufacturer.appendChild(option);
      });
      manufacturer.disabled = false;
    }
    configureUsageStep();
  });

  const resultStep = form.querySelector('[data-step="12"]');
  if (resultStep) {
    const observer = new MutationObserver(function () {
      if (resultStep.hidden || !isNonDJI()) return;
      const text = resultStep.textContent || "";
      if (text.includes("-- Select package --") || text.includes("£0.00") || text.includes("Your Instant Quote")) {
        window.setTimeout(renderManualResult, 0);
      }
    });
    observer.observe(resultStep, { childList: true, subtree: true });
  }
});
