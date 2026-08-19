/* GearCashOut — connect completed quotes to the signed-in customer account. */
(function () {
  "use strict";

  const RESUME_KEY = "gearCashOutQuoteResume";
  const RETURN_KEY = "actionBuyerReturnAfterAuth";

  function safeQuoteData() {
    try {
      const raw = localStorage.getItem("wba_latest_quote");
      return raw ? JSON.parse(raw) : null;
    } catch (error) { console.error("Could not read saved quote:", error); return null; }
  }
  function quoteStatus(data) { return data && data.quoteAmount !== null && data.quoteAmount !== undefined ? "valued" : "manual_review"; }
  function cleanQuoteData(data) { if (!data) return {}; const copy = { ...data }; copy.photos = []; delete copy.bankName; delete copy.accountNumber; delete copy.sortCode; return copy; }

  function saveReturnPath(path) { try { localStorage.setItem(RETURN_KEY, path || "quote.html"); } catch (_) {} }
  function clearReturnPath() { try { localStorage.removeItem(RETURN_KEY); } catch (_) {} }

  function selectedText(select) { return select && select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : ""; }
  function checkedValue(name) { const selected = document.querySelector('input[name="' + name + '"]:checked'); return selected ? selected.value : ""; }
  function numberFromText(text) { const match = String(text || "").replace(/,/g, "").match(/£\s*([0-9]+(?:\.[0-9]+)?)/); return match ? Number(match[1]) : null; }

  function buildQuoteResume() {
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const model = document.getElementById("dji-model");
    const packageSelect = document.getElementById("package-select");
    const flightHours = document.getElementById("flight-hours");
    const usageCount = document.getElementById("gear-usage-count");
    const title = document.getElementById("quote-result-title");
    const price = document.querySelector("#quote-summary .quote-price");
    const photoInput = document.getElementById("photo-uploads");

    const batteries = Array.from(document.querySelectorAll(".battery-entry")).map(function (entry) {
      const type = entry.querySelector(".battery-type"), cycles = entry.querySelector(".battery-cycles");
      return { type: type ? type.value.trim() : "", cycles: cycles ? Number(cycles.value) : 0 };
    });

    const packageContents = {};
    document.querySelectorAll(".package-content-select, .generic-content-select").forEach(function (select) {
      packageContents[select.dataset.contentId || select.id || "item"] = select.value;
    });

    const additionalAccessories = Array.from(document.querySelectorAll(".additional-accessory-row")).map(function (row) {
      const name = row.querySelector(".accessory-name"), quantity = row.querySelector(".accessory-qty");
      return { name: name ? name.value.trim() : "", quantity: quantity ? Number(quantity.value) || 1 : 1 };
    }).filter(function (item) { return item.name; });

    const additionalItems = Array.from(document.querySelectorAll(".additional-item-row")).map(function (row) {
      const type = row.querySelector(".additional-item-type"), brand = row.querySelector(".additional-item-manufacturer"), part = row.querySelector(".additional-item-model"), other = row.querySelector(".additional-item-other"), quantity = row.querySelector(".additional-item-quantity");
      return { type: type ? type.value : "", manufacturer: brand ? brand.value : "", model: part ? part.value : "", other: other ? other.value.trim() : "", quantity: quantity ? Number(quantity.value) || 1 : 1 };
    });

    return {
      category: category ? category.value : "", categoryName: selectedText(category),
      manufacturer: manufacturer ? manufacturer.value : "", manufacturerName: selectedText(manufacturer),
      model: model ? model.value : "", modelName: selectedText(model),
      package: packageSelect ? packageSelect.value : "", packageName: selectedText(packageSelect),
      condition: checkedValue("condition"),
      flightHours: flightHours ? flightHours.value : "", flightHoursRange: checkedValue("flightHoursRange"), usageCount: usageCount ? usageCount.value : "",
      batteries: batteries, unbound: checkedValue("unbound"), damage: checkedValue("damage"),
      damageDescription: (document.getElementById("damage-description") || {}).value || "",
      packageContents: packageContents, additionalAccessories: additionalAccessories, additionalItems: additionalItems,
      droneSerial: (document.getElementById("drone-serial-number") || {}).value || "", controllerSerial: (document.getElementById("controller-serial-number") || {}).value || "",
      legalRight: checkedValue("legalRight"),
      quoteAmount: numberFromText(price ? price.textContent : ""),
      manualValuation: !!(title && /manual valuation|manual validation/i.test(title.textContent)),
      photosProvided: !!(photoInput && photoInput.files && photoInput.files.length),
      created: new Date().toISOString()
    };
  }

  function saveQuoteResume() {
    try { localStorage.setItem(RESUME_KEY, JSON.stringify(buildQuoteResume())); saveReturnPath("quote.html"); }
    catch (error) { console.error("Could not preserve quote before account sign-in:", error); }
  }
  function getQuoteResume() { try { const raw = localStorage.getItem(RESUME_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
  function clearQuoteResume() { try { localStorage.removeItem(RESUME_KEY); } catch (_) {} }

  function showStepDirect(number) {
    const form = document.getElementById("quote-form"); if (!form) return;
    form.querySelectorAll(".wizard-step").forEach(function (step) { step.hidden = Number(step.dataset.step) !== number; });
    const progress = document.getElementById("progress-indicator");
    if (progress) progress.querySelectorAll(".progress-step").forEach(function (item) { const n = Number(item.dataset.step || item.textContent.split(".")[0]); if (n === number) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current"); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreQuoteAfterLogin() {
    const saved = getQuoteResume(); if (!saved) return;
    const step = document.querySelector('#quote-form .wizard-step[data-step="13"]');
    if (!step) return;

    let notice = step.querySelector(".quote-restored-notice");
    if (!notice) {
      notice = document.createElement("div"); notice.className = "quote-restored-notice notice";
      notice.innerHTML = "<strong>Your valuation has been saved.</strong> We restored your quote so you do not need to start again.";
      const firstField = step.querySelector("#full-name"); if (firstField && firstField.parentNode) firstField.parentNode.insertBefore(notice, firstField);
    }

    if (saved.manualValuation) prepareManualCustomerDetails(step);
    showStepDirect(13);
    window.setTimeout(function () { if (window.actionBuyerAuth && typeof window.actionBuyerAuth.prefillQuoteCustomerDetails === "function") window.actionBuyerAuth.prefillQuoteCustomerDetails(); }, 100);
  }

  function makeQuoteRecord(saved) {
    const value = function (id) { const field = document.getElementById(id); return field ? field.value.trim() : ""; };
    return {
      manufacturer: saved.manufacturer || "", model: saved.model || "", package: saved.package || "", condition: saved.condition || "",
      flightHours: saved.flightHours || "", flightHoursRange: saved.flightHoursRange || "", batteries: saved.batteries || [],
      unbound: saved.unbound || "", damage: saved.damage || "", damageDescription: saved.damageDescription || "", packageContents: saved.packageContents || {},
      additionalAccessories: saved.additionalAccessories || [], additionalItems: saved.additionalItems || [], droneSerial: saved.droneSerial || "", controllerSerial: saved.controllerSerial || "", photos: [], legalRight: saved.legalRight || "",
      fullName: value("full-name"), email: value("email-address"), phone: value("phone-number"), addressLine1: value("address-line-1"), addressLine2: value("address-line-2"), city: value("city"), county: value("county"), postcode: value("postcode").toUpperCase(),
      bankName: "", accountNumber: "", sortCode: "", quoteAmount: saved.manualValuation ? null : saved.quoteAmount,
      quoteReference: "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000),
      category: saved.category || "", categoryName: saved.categoryName || "", manufacturerName: saved.manufacturerName || "", modelName: saved.modelName || "", packageName: saved.packageName || "",
      status: saved.manualValuation ? "manual_review" : "valued", resumedAfterLogin: true, created: new Date().toISOString()
    };
  }

  function showSubmittedScreen(record) {
    const steps = Array.from(document.querySelectorAll("#quote-form .wizard-step"));
    const step14 = steps.find(function (step) { return Number(step.dataset.step) === 14; }); if (!step14) return;
    steps.forEach(function (step) { step.hidden = step !== step14; });
    const heading = step14.querySelector("h3"); if (heading) heading.textContent = record.quoteAmount === null ? "Manual Valuation Submitted" : "Quote Submitted";
    const reference = step14.querySelector("#quote-reference"); if (reference) reference.textContent = record.quoteReference;
    const navigation = step14.querySelector(".navigation-buttons"); if (navigation) navigation.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveQuoteToAccount() {
    const saved = safeQuoteData(); if (!saved || !saved.quoteReference) return;
    if (!window.actionBuyerAuth || !window.actionBuyerAuth.supabase) return;
    const { data: userData, error: userError } = await window.actionBuyerAuth.supabase.auth.getUser();
    if (userError || !userData || !userData.user) return;
    const displayModel = saved.multiItemQuote ? `${Number(saved.quoteItemCount) || 0} items` : (saved.model || null);
    const record = { user_id: userData.user.id, quote_reference: saved.quoteReference, status: quoteStatus(saved), manufacturer: saved.multiItemQuote ? "Multiple" : (saved.manufacturer || null), model: displayModel, package: saved.multiItemQuote ? "Combined quote" : (saved.package || null), condition: saved.multiItemQuote ? "Multiple items" : (saved.condition || null), quote_amount: saved.quoteAmount === null || saved.quoteAmount === undefined ? null : Number(saved.quoteAmount), quote_data: cleanQuoteData(saved) };
    const { error } = await window.actionBuyerAuth.supabase.from("valuations").upsert(record, { onConflict: "quote_reference" });
    if (error) console.error("Could not save valuation to customer account:", error);
  }

  function isManualStep12(step) { if (!step) return false; const title = step.querySelector("h3"), button = step.querySelector("#continue-with-quote, .btn-accept, #quote-result-action"); const titleText = title ? title.textContent.toLowerCase() : "", buttonText = button ? button.textContent.toLowerCase() : ""; return titleText.includes("manual valuation") || titleText.includes("manual validation") || buttonText.includes("manual review") || (button && button.dataset.quoteAction === "manual"); }
  function setManualMode() { try { sessionStorage.setItem("actionBuyerManualValuation", "true"); } catch (_) {} }
  function isManualMode() { try { return sessionStorage.getItem("actionBuyerManualValuation") === "true"; } catch (_) { return false; } }
  function clearManualMode() { try { sessionStorage.removeItem("actionBuyerManualValuation"); } catch (_) {} }

  function prepareManualCustomerDetails(step) {
    if (!step) return;
    const addressFieldset = step.querySelector("fieldset");
    step.querySelectorAll("#address-line-1, #address-line-2, #city, #county, #postcode").forEach(function (input) { input.required = false; input.value = ""; });
    if (addressFieldset) addressFieldset.hidden = true;
    let notice = step.querySelector(".manual-address-notice");
    if (!notice) { notice = document.createElement("div"); notice.className = "manual-address-notice notice"; notice.innerHTML = "<strong>Address not required yet.</strong> Your full return address will only be requested if a purchase offer is made and you choose to proceed."; const phone = step.querySelector("#phone-number"); if (phone && phone.parentNode) phone.parentNode.insertBefore(notice, phone.nextSibling); else step.insertBefore(notice, step.firstChild); }
  }

  function generateManualReference() { return "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000); }
  function saveManualQuoteLocally() {
    const value = function (id) { const field = document.getElementById(id); return field ? field.value.trim() : ""; };
    const manufacturer = document.getElementById("gear-manufacturer"), model = document.getElementById("dji-model"), packageSelect = document.getElementById("package-select"), condition = document.querySelector('input[name="condition"]:checked');
    const record = { manufacturer: manufacturer ? manufacturer.value : "", model: model ? model.value : "", package: packageSelect ? packageSelect.value : "", condition: condition ? condition.value : "", flightHours: "", flightHoursRange: "", batteries: [], unbound: "", damage: "", damageDescription: "", packageContents: {}, additionalAccessories: [], droneSerial: "", controllerSerial: "", photos: [], legalRight: "", fullName: value("full-name"), email: value("email-address"), phone: value("phone-number"), addressLine1: "", addressLine2: "", city: "", county: "", postcode: "", bankName: "", accountNumber: "", sortCode: "", quoteAmount: null, quoteReference: generateManualReference(), created: new Date().toISOString() };
    try { localStorage.setItem("wba_latest_quote", JSON.stringify(record)); } catch (error) { return null; }
    return record;
  }
  function showManualSubmittedScreen(record) {
    const steps = Array.from(document.querySelectorAll("#quote-form .wizard-step")); const step14 = steps.find(step => Number(step.dataset.step) === 14); if (!step14) return; steps.forEach(step => { step.hidden = step !== step14; }); const heading = step14.querySelector("h3"); if (heading) heading.textContent = "Manual Valuation Submitted"; const reference = step14.querySelector("#quote-reference"); if (reference) reference.textContent = record.quoteReference; const navigation = step14.querySelector(".navigation-buttons"); if (navigation) navigation.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>'; window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form"); if (!form) return;

    window.setTimeout(function () { if (getQuoteResume()) restoreQuoteAfterLogin(); }, 300);

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button"); if (!button) return;
      const step = button.closest(".wizard-step"); if (!step) return;
      const stepNumber = Number(step.dataset.step);

      if (stepNumber === 12 && isManualStep12(step)) { setManualMode(); return; }
      if (stepNumber !== 13 || !button.classList.contains("btn-next")) return;

      event.preventDefault(); event.stopImmediatePropagation();
      (async function () {
        const session = window.actionBuyerAuth ? await window.actionBuyerAuth.getSession() : null;
        if (!session) {
          saveQuoteResume(); saveReturnPath("quote.html"); window.location.href = "login.html?return=quote.html"; return;
        }

        const saved = getQuoteResume();
        if (saved) {
          if (saved.manualValuation) prepareManualCustomerDetails(step);
          const fullName = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number");
          if (!fullName || !fullName.value.trim()) return alert("Please enter your full name.");
          if (!email || !email.value.trim()) return alert("Please enter your email address.");
          if (!phone || !phone.value.trim()) return alert("Please enter your telephone number.");
          const record = makeQuoteRecord(saved);
          try { localStorage.setItem("wba_latest_quote", JSON.stringify(record)); } catch (_) {}
          await saveQuoteToAccount(); clearQuoteResume(); clearReturnPath(); clearManualMode(); showSubmittedScreen(record); return;
        }

        if (isManualMode()) {
          prepareManualCustomerDetails(step);
          const record = saveManualQuoteLocally(); if (!record) return;
          showManualSubmittedScreen(record); await saveQuoteToAccount(); clearManualMode(); return;
        }

        /* No resume is present: the normal quote engine remains responsible for this submission. */
        window.setTimeout(function () { saveQuoteToAccount(); }, 250);
      })();
    }, true);
  });

  window.gearCashOutSaveQuoteToAccount = saveQuoteToAccount;

  (function () {
    const load = function () { if (document.querySelector('script[data-gear-enhancements]')) return; const script = document.createElement("script"); script.src = "quote-enhancements.js"; script.defer = true; script.dataset.gearEnhancements = "true"; document.head.appendChild(script); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load();
  })();

  (function () {
    const load = function () { if (document.querySelector('script[data-multi-item-quote]')) return; const script = document.createElement("script"); script.src = "multi-item-quote.js"; script.dataset.multiItemQuote = "true"; document.head.appendChild(script); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load();
  })();
})();
