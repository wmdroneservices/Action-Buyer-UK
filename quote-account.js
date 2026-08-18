/* GearCashOut — connect completed quotes to the signed-in customer account. */
(function () {
  "use strict";
  function safeQuoteData() { try { const raw = localStorage.getItem("wba_latest_quote"); return raw ? JSON.parse(raw) : null; } catch (error) { console.error("Could not read saved quote:", error); return null; } }
  function quoteStatus(data) { return data && data.quoteAmount !== null && data.quoteAmount !== undefined ? "valued" : "manual_review"; }
  function cleanQuoteData(data) { if (!data) return {}; const copy = { ...data }; copy.photos = []; delete copy.bankName; delete copy.accountNumber; delete copy.sortCode; return copy; }
  async function saveQuoteToAccount() {
    const saved = safeQuoteData(); if (!saved || !saved.quoteReference) return;
    if (!window.actionBuyerAuth || !window.actionBuyerAuth.supabase) { console.error("GearCashOut authentication client is not loaded."); return; }
    const { data: userData, error: userError } = await window.actionBuyerAuth.supabase.auth.getUser();
    if (userError || !userData || !userData.user) { console.warn("No authenticated customer account; quote was not saved to an account."); return; }
    const record = { user_id: userData.user.id, quote_reference: saved.quoteReference, status: quoteStatus(saved), manufacturer: saved.manufacturer || null, model: saved.model || null, package: saved.package || null, condition: saved.condition || null, quote_amount: saved.quoteAmount === null || saved.quoteAmount === undefined ? null : Number(saved.quoteAmount), quote_data: cleanQuoteData(saved) };
    const { error } = await window.actionBuyerAuth.supabase.from("valuations").upsert(record, { onConflict: "quote_reference" });
    if (error) { console.error("Could not save valuation to customer account:", error); return; }
    console.log("GearCashOut valuation saved to customer account:", saved.quoteReference);
  }
  function isManualStep12(step) { if (!step) return false; const title = step.querySelector("h3"); const button = step.querySelector(".btn-accept, #quote-result-action"); const titleText = title ? title.textContent.toLowerCase() : ""; const buttonText = button ? button.textContent.toLowerCase() : ""; return titleText.includes("manual validation") || buttonText.includes("manual review") || (button && button.dataset.quoteAction === "manual"); }
  function setManualMode() { try { sessionStorage.setItem("actionBuyerManualValuation", "true"); } catch (error) { console.warn("Could not store manual valuation mode.", error); } }
  function isManualMode() { try { return sessionStorage.getItem("actionBuyerManualValuation") === "true"; } catch (error) { return false; } }
  function clearManualMode() { try { sessionStorage.removeItem("actionBuyerManualValuation"); } catch (error) {} }
  function prepareManualCustomerDetails(step) {
    if (!step) return;
    const addressFieldset = step.querySelector("fieldset");
    const addressInputs = step.querySelectorAll("#address-line-1, #address-line-2, #city, #county, #postcode");
    addressInputs.forEach(function (input) { input.required = false; input.value = ""; });
    if (addressFieldset) addressFieldset.hidden = true;
    let notice = step.querySelector(".manual-address-notice");
    if (!notice) { notice = document.createElement("div"); notice.className = "manual-address-notice notice"; notice.innerHTML = "<strong>Address not required yet.</strong> Your full return address will only be requested if a purchase offer is made and you choose to proceed."; const phone = step.querySelector("#phone-number"); if (phone && phone.parentNode) phone.parentNode.insertBefore(notice, phone.nextSibling); else step.insertBefore(notice, step.firstChild); }
  }
  function generateManualReference() { return "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000); }
  function saveManualQuoteLocally() {
    const fullName = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number"), model = document.getElementById("dji-model"), packageSelect = document.getElementById("package-select"), condition = document.querySelector('input[name="condition"]:checked'), manufacturer = document.querySelector('input[name="manufacturer"]:checked');
    const record = { manufacturer: manufacturer ? manufacturer.value : "", model: model ? model.value : "", package: packageSelect ? packageSelect.value : "", condition: condition ? condition.value : "", flightHours: "", flightHoursRange: "", batteries: [], unbound: "", damage: "", damageDescription: "", packageContents: {}, additionalAccessories: [], droneSerial: "", controllerSerial: "", photos: [], legalRight: "", fullName: fullName ? fullName.value.trim() : "", email: email ? email.value.trim() : "", phone: phone ? phone.value.trim() : "", addressLine1: "", addressLine2: "", city: "", county: "", postcode: "", bankName: "", accountNumber: "", sortCode: "", quoteAmount: null, quoteReference: generateManualReference(), created: new Date().toISOString() };
    try { localStorage.setItem("wba_latest_quote", JSON.stringify(record)); } catch (error) { console.error("Could not save manual valuation locally.", error); return null; }
    return record;
  }
  function showManualSubmittedScreen(record) {
    const steps = Array.from(document.querySelectorAll("#quote-form .wizard-step")); const step14 = steps.find(step => Number(step.dataset.step) === 14); if (!step14) return; steps.forEach(step => { step.hidden = step !== step14; }); const heading = step14.querySelector("h3"); if (heading) heading.textContent = "Manual Valuation Submitted"; const reference = step14.querySelector("#quote-reference"); if (reference) reference.textContent = record.quoteReference; const paragraphs = step14.querySelectorAll("p"); paragraphs.forEach(function (paragraph) { if (paragraph.textContent.includes("Your quote information has been recorded")) paragraph.textContent = "Your information and photographs have been submitted for manual review."; if (paragraph.textContent.includes("BACKEND INTEGRATION REQUIRED")) paragraph.hidden = true; }); const navigation = step14.querySelector(".navigation-buttons"); if (navigation) navigation.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>'; window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form"); if (!form) return;
    form.addEventListener("click", function (event) {
      const button = event.target.closest("button"); if (!button) return; const step = button.closest(".wizard-step"); if (!step) return; const stepNumber = Number(step.dataset.step);
      if (stepNumber === 12 && isManualStep12(step)) { setManualMode(); return; }
      if (stepNumber !== 13) return;
      if (isManualMode()) {
        event.preventDefault(); event.stopImmediatePropagation(); prepareManualCustomerDetails(step);
        (async function () { const session = window.actionBuyerAuth ? await window.actionBuyerAuth.getSession() : null; if (!session) { alert("Please sign in or create a GearCashOut account before submitting your valuation."); window.location.href = "login.html?return=quote.html"; return; } const fullName = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number"); if (!fullName || !fullName.value.trim()) return alert("Please enter your full name."); if (!email || !email.value.trim()) return alert("Please enter your email address."); if (!phone || !phone.value.trim()) return alert("Please enter your telephone number."); const record = saveManualQuoteLocally(); if (!record) return; showManualSubmittedScreen(record); await saveQuoteToAccount(); clearManualMode(); })(); return;
      }
      (async function () { const session = window.actionBuyerAuth ? await window.actionBuyerAuth.getSession() : null; if (!session) { event.preventDefault(); event.stopImmediatePropagation(); alert("Please sign in or create a GearCashOut account before submitting your valuation. Your account is used to track the submission and its status."); window.location.href = "login.html?return=quote.html"; return; } window.setTimeout(saveQuoteToAccount, 250); })();
    }, true);
  });
  window.gearCashOutSaveQuoteToAccount = saveQuoteToAccount;
})();

/* Load the package/additional-item enhancement without replacing the working quote engine. */
(function () {
  const load = function () { if (document.querySelector('script[data-gear-enhancements]')) return; const script = document.createElement("script"); script.src = "quote-enhancements.js"; script.defer = true; script.dataset.gearEnhancements = "true"; document.head.appendChild(script); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load();
})();

/* Load the multi-item quote basket. */
(function () {
  const load = function () {
    if (document.querySelector('script[data-multi-item-quote]')) return;
    const script = document.createElement("script");
    script.src = "multi-item-quote.js";
    script.dataset.multiItemQuote = "true";
    document.head.appendChild(script);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load();
})();
