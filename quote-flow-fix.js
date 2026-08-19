document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  const progress = document.getElementById("progress-indicator");
  if (!form || !category || !manufacturer || !model) return;

  function isDJIDrone() { return category.value === "drone" && manufacturer.value === "DJI"; }
  function selectedText(select) { return select && select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : ""; }
  function show(stepNo) {
    if (typeof showStep === "function") showStep(stepNo);
    else form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = Number(s.dataset.step) !== stepNo; });
    updateProgress(stepNo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateProgress(stepNo) {
    if (!progress) return;
    progress.querySelectorAll(".progress-step").forEach(function (item) {
      const n = Number(item.dataset.step || item.textContent.split(".")[0]);
      item.classList.toggle("active", n === stepNo);
      if (n === stepNo) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
    });
  }
  function legacyManufacturer(value) {
    let hidden = form.querySelector('input[name="manufacturer"][value="dji"]');
    if (!hidden) { hidden = document.createElement("input"); hidden.type = "radio"; hidden.name = "manufacturer"; hidden.value = "dji"; hidden.hidden = true; form.appendChild(hidden); }
    hidden.checked = value === "DJI";
    hidden.dataset.selectedManufacturer = value;
  }
  function configureUsageStep() {
    const step = form.querySelector('[data-step="5"]'); if (!step) return;
    const heading = step.querySelector("h3"), label = step.querySelector('label[for="flight-hours"]'), input = document.getElementById("flight-hours"), range = step.querySelector("fieldset"), usage = document.getElementById("gear-usage-count-wrap");
    if (category.value === "drone") { if (heading) heading.textContent = "Step 5: Flight Time"; if (label) label.textContent = "Total flight hours completed"; if (input) input.placeholder = "e.g. 4.2"; if (range) range.hidden = false; if (usage) usage.hidden = true; }
    else { if (heading) heading.textContent = "Step 5: Usage Information"; if (label) label.textContent = "Shutter / usage count, if known"; if (input) input.placeholder = "Optional"; if (range) range.hidden = true; if (usage) usage.hidden = false; }
  }

  function rebuildLaterSteps() {
    if (form.dataset.gcoLayout === "2") return;
    const step10 = form.querySelector('[data-step="10"]'), step11 = form.querySelector('[data-step="11"]'), resultStep = form.querySelector('[data-step="12"]'), customerStep = form.querySelector('[data-step="13"]'), submittedStep = form.querySelector('[data-step="14"]'), shippingStep = form.querySelector('[data-step="15"]'), finalStep = form.querySelector('[data-step="16"]');
    if (!step10 || !step11 || !resultStep || !customerStep || !submittedStep || !shippingStep || !finalStep) return;
    form.dataset.gcoLayout = "2";

    step10.innerHTML = `<h3>Step 10: Additional Items</h3><p>Add equipment or accessories that are <strong>in addition to</strong> the selected package.</p><p>We need the manufacturer and model before we can apply any value to an additional item.</p><div id="additional-items-v2"></div><button type="button" class="btn" id="add-additional-item-v2">Add Additional Item</button><div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;
    step11.innerHTML = `<h3>Step 11: Serial Numbers</h3><p>Enter the serial numbers printed on the equipment.</p><label for="drone-serial-number">Equipment Serial Number</label><input type="text" id="drone-serial-number" maxlength="50" placeholder="Enter serial number"><label for="controller-serial-number">Controller Serial Number (if applicable)</label><input type="text" id="controller-serial-number" maxlength="50" placeholder="Optional"><div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;

    const photoStep = document.createElement("section");
    photoStep.className = "wizard-step"; photoStep.dataset.step = "12"; photoStep.hidden = true;
    photoStep.innerHTML = `<h3>Step 12: Photographs</h3><p>Upload clear photographs to help us verify the equipment.</p><ul><li>Equipment front and rear</li><li>Serial number label</li><li>All included package contents</li><li>Damage, if applicable</li><li>Additional items, if applicable</li></ul><label for="photo-uploads">Upload photographs</label><input type="file" id="photo-uploads" name="photos" accept="image/*" multiple><div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;
    resultStep.parentNode.insertBefore(photoStep, resultStep);
    resultStep.dataset.step = "13"; customerStep.dataset.step = "14"; submittedStep.dataset.step = "15"; shippingStep.dataset.step = "16"; finalStep.dataset.step = "17";

    if (progress) {
      const labels = ["Equipment & Manufacturer","Model","Exact Package","Condition","Usage Information","Package Batteries","Unbound","Damage","Package Contents","Additional Items","Serial Numbers","Photographs","Quote Result","Customer Details","Quote Submitted","Shipping Instructions","Final Inspection"];
      progress.innerHTML = labels.map(function (label, index) { const hidden = index === 5 ? " hidden" : ""; return '<li class="progress-step" data-step="' + (index + 1) + '"' + hidden + '>' + (index + 1) + '. ' + label + '</li>'; }).join("");
    }
  }

  function populateGenericPackageContents() {
    if (isDJIDrone()) return;
    const container = document.getElementById("package-contents-list"); if (!container) return;
    const cat = category.value;
    const items = cat === "camera" ? ["Camera body","Battery","Battery charger / charging cable","USB / data cable","Strap","Body cap","Original box / packaging"] : cat === "action-camera" ? ["Action camera","Battery","Charging cable","Mounting accessories","Protective case","Original box / packaging"] : cat === "lens" ? ["Lens","Front lens cap","Rear lens cap","Lens hood","Case / pouch","Original box / packaging"] : ["Main equipment","Battery / power supply","Charger / charging cable","Cables","Case / bag","Original box / packaging"];
    container.innerHTML = items.map(function (name, index) { return '<div class="package-content-row"><label for="generic-content-' + index + '">' + name + '</label><select id="generic-content-' + index + '" class="generic-content-select"><option value="">-- Select status --</option><option value="present">Present</option><option value="missing">Missing</option></select></div>'; }).join("");
  }
  function accessoryManufacturers() {
    const names = []; if (manufacturer.value) names.push(manufacturer.value);
    if (window.gearCatalogue && window.gearCatalogue.accessory) Object.keys(window.gearCatalogue.accessory).forEach(function (name) { if (!names.includes(name)) names.push(name); });
    return names;
  }
  function addAdditionalItem() {
    const container = document.getElementById("additional-items-v2"); if (!container) return;
    const row = document.createElement("div"); row.className = "additional-item-row";
    row.innerHTML = `<hr><label>Item type<select class="additional-item-type"><option value="">-- Select item type --</option><option>Battery</option><option>Controller</option><option>Charger</option><option>Hard Case</option><option>Carry Case / Bag</option><option>Propeller Set</option><option>Cable</option><option>Lens</option><option>Memory Card</option><option>Other Accessory</option></select></label><label>Manufacturer / Brand<select class="additional-item-manufacturer"><option value="">-- Select manufacturer --</option></select></label><label>Model / Part<select class="additional-item-model" disabled><option value="">-- Select model / part --</option></select></label><label>Quantity<select class="additional-item-quantity"><option>1</option><option>2</option><option>3</option></select></label><label class="additional-item-other-wrap" hidden>Other item description<input type="text" class="additional-item-other" placeholder="Describe the item"></label><button type="button" class="btn btn-remove-additional">Remove</button>`;
    container.appendChild(row);
    const brand = row.querySelector(".additional-item-manufacturer"), modelSelect = row.querySelector(".additional-item-model"), type = row.querySelector(".additional-item-type"), otherWrap = row.querySelector(".additional-item-other-wrap");
    accessoryManufacturers().forEach(function (name) { const option = document.createElement("option"); option.value = name; option.textContent = name; brand.appendChild(option); });
    brand.value = manufacturer.value || "";
    function updateModels() {
      modelSelect.innerHTML = '<option value="">-- Select model / part --</option>'; modelSelect.disabled = true;
      const list = window.gearCatalogue && window.gearCatalogue.accessory && window.gearCatalogue.accessory[brand.value];
      if (list) { list.forEach(function (item) { const option = document.createElement("option"); option.value = item[0]; option.textContent = item[1]; modelSelect.appendChild(option); }); modelSelect.disabled = false; }
    }
    brand.addEventListener("change", updateModels); type.addEventListener("change", function () { otherWrap.hidden = type.value !== "Other Accessory"; }); updateModels();
  }
  function renderAdditionalItems() { const container = document.getElementById("additional-items-v2"); if (container && !container.children.length) addAdditionalItem(); }
  function validateGenericPackageContents() { if (isDJIDrone()) return true; for (const select of Array.from(form.querySelectorAll(".generic-content-select"))) { if (!select.value) { alert("Please mark every package item as Present or Missing."); return false; } } return true; }
  function validateAdditionalItems() {
    for (const row of Array.from(form.querySelectorAll(".additional-item-row"))) {
      const type = row.querySelector(".additional-item-type").value, brand = row.querySelector(".additional-item-manufacturer").value, modelSelect = row.querySelector(".additional-item-model"), other = row.querySelector(".additional-item-other");
      if (!type || !brand) { alert("Please select the item type and manufacturer for every additional item."); return false; }
      if (type === "Other Accessory") { if (!other || !other.value.trim()) { alert("Please describe the other additional accessory."); return false; } }
      else if (!modelSelect.value) { alert("Please select the model or part for every additional item."); return false; }
    }
    return true;
  }
  function validateSerialNumbersV2() { const equipment = document.getElementById("drone-serial-number"); if (!equipment || !equipment.value.trim()) { alert("Please enter the equipment serial number."); return false; } return true; }
  function validatePhotosV2() { const photos = document.getElementById("photo-uploads"); if (!photos || !photos.files || photos.files.length === 0) { alert("Please upload at least one photograph before continuing."); return false; } return true; }
  function clearCurrentItem() { category.value = ""; manufacturer.innerHTML = '<option value="">-- Select manufacturer --</option>'; manufacturer.disabled = true; model.innerHTML = '<option value="">-- Select a model --</option>'; model.disabled = true; }
  function addAnotherItem() { clearCurrentItem(); show(1); }
  function saveManualBasketItem() { try { const basket = JSON.parse(localStorage.getItem("gearCashOutQuoteBasket") || "[]"); const item = { category: category.value, categoryName: selectedText(category), manufacturer: manufacturer.value, manufacturerName: selectedText(manufacturer), model: model.value, modelName: selectedText(model), valuation: "manual", amount: null }; if (!basket.some(function (x) { return x.model === item.model && x.manufacturer === item.manufacturer; })) basket.push(item); localStorage.setItem("gearCashOutQuoteBasket", JSON.stringify(basket)); return basket; } catch (_) { return []; } }

  function handleClick(event) {
    const button = event.target.closest("button"); if (!button || !form.contains(button)) return;
    const step = Array.from(form.querySelectorAll(".wizard-step")).find(function (s) { return !s.hidden; }); if (!step) return;
    const n = Number(step.dataset.step);
    if (button.classList.contains("btn-back")) {
      const previous = {2:1,3:2,4:2,5:4,6:5,7:6,8:5,9:8,10:9,11:10,12:11,13:12,14:13,15:14,16:15,17:16}[n];
      if (previous) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); show(previous); return; }
    }
    if (button.id === "add-additional-item-v2") { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); addAdditionalItem(); return; }
    if (button.classList.contains("btn-remove-additional")) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); const row = button.closest(".additional-item-row"); if (row) row.remove(); return; }
    if (!button.classList.contains("btn-next") && !button.classList.contains("btn-accept") && button.id !== "quote-result-action" && button.id !== "add-another-item" && button.id !== "continue-with-quote") return;

    if (n === 1) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!category.value) return alert("Please select an equipment type."); if (!manufacturer.value) return alert("Please select a manufacturer."); const catalogue = window.gearCatalogue && window.gearCatalogue[category.value]; if (!catalogue || !catalogue[manufacturer.value]) return alert("This manufacturer is not currently available."); legacyManufacturer(manufacturer.value); model.innerHTML = '<option value="">-- Select a model --</option>'; catalogue[manufacturer.value].forEach(function (item) { const option = document.createElement("option"); option.value = item[0]; option.textContent = item[1]; model.appendChild(option); }); model.disabled = false; configureUsageStep(); show(2); return; }
    if (n === 2) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!model.value) return alert("Please select a model."); configureUsageStep(); show(isDJIDrone() ? 3 : 4); return; }

    if (!isDJIDrone()) {
      if (n === 4) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!form.querySelector('input[name="condition"]:checked')) return alert("Please select the condition."); show(5); return; }
      if (n === 5) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); show(8); return; }
      if (n === 8) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!form.querySelector('input[name="damage"]:checked')) return alert("Please select Yes or No for damage."); show(9); populateGenericPackageContents(); return; }
      if (n === 9) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!validateGenericPackageContents()) return; show(10); renderAdditionalItems(); return; }
      if (n === 10) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!validateAdditionalItems()) return; show(11); return; }
      if (n === 11) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!validateSerialNumbersV2()) return; show(12); return; }
      if (n === 12) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (!validatePhotosV2()) return; saveManualBasketItem(); show(13); window.setTimeout(function () { if (typeof window.renderGearCashOutManualResult === "function") window.renderGearCashOutManualResult(); }, 0); return; }
      if (n === 13 && (button.id === "add-another-item" || button.id === "continue-with-quote" || button.classList.contains("btn-accept") || button.id === "quote-result-action")) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (button.id === "add-another-item") { addAnotherItem(); return; } saveManualBasketItem(); show(14); return; }
      if (n === 14 && button.classList.contains("btn-next")) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); const name = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number"); if (!name || !name.value.trim()) return alert("Please enter your full name."); if (!email || !email.value.trim()) return alert("Please enter your email address."); if (!phone || !phone.value.trim()) return alert("Please enter your telephone number."); show(15); return; }
      if (n === 15) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); show(16); return; }
      if (n === 16) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); show(17); return; }
    }
  }

  rebuildLaterSteps();
  form.addEventListener("click", handleClick, true);
  configureUsageStep();
  updateProgress(1);
});
