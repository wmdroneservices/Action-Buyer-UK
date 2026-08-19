/* GearCashOut quote/account bridge.
   Important: a customer must never lose a completed valuation because login was required. */
(function () {
  "use strict";

  const RESUME_KEY = "gearCashOutQuoteResume";
  const RETURN_KEY = "actionBuyerReturnAfterAuth";

  function getSessionMarker() { try { return localStorage.getItem("gearCashOutAuthenticated") === "true"; } catch (_) { return false; } }
  function saveReturnPath() { try { localStorage.setItem(RETURN_KEY, "quote.html"); } catch (_) {} }
  function clearReturnPath() { try { localStorage.removeItem(RETURN_KEY); } catch (_) {} }
  function getResume() { try { const raw = localStorage.getItem(RESUME_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
  function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch (_) {} }
  function selectedText(select) { return select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : ""; }
  function checked(name) { const el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function money(text) { const m = String(text || "").replace(/,/g, "").match(/£\s*([0-9]+(?:\.[0-9]+)?)/); return m ? Number(m[1]) : null; }

  function buildResume() {
    const category = document.getElementById("gear-category"), manufacturer = document.getElementById("gear-manufacturer"), model = document.getElementById("dji-model"), packageSelect = document.getElementById("package-select"), title = document.getElementById("quote-result-title"), price = document.querySelector("#quote-summary .quote-price");
    const batteries = Array.from(document.querySelectorAll(".battery-entry")).map(row => ({ type: row.querySelector(".battery-type")?.value || "", cycles: Number(row.querySelector(".battery-cycles")?.value || 0) }));
    const contents = {}; document.querySelectorAll(".package-content-select, .generic-content-select").forEach(el => { contents[el.dataset.contentId || el.id] = el.value; });
    return { category: category?.value || "", categoryName: selectedText(category), manufacturer: manufacturer?.value || "", manufacturerName: selectedText(manufacturer), model: model?.value || "", modelName: selectedText(model), package: packageSelect?.value || "", packageName: selectedText(packageSelect), condition: checked("condition"), flightHours: document.getElementById("flight-hours")?.value || "", flightHoursRange: checked("flightHoursRange"), batteries, unbound: checked("unbound"), damage: checked("damage"), damageDescription: document.getElementById("damage-description")?.value || "", packageContents: contents, droneSerial: document.getElementById("drone-serial-number")?.value || "", controllerSerial: document.getElementById("controller-serial-number")?.value || "", legalRight: checked("legalRight"), quoteAmount: money(price?.textContent), manualValuation: /manual valuation|manual validation/i.test(title?.textContent || ""), photosProvided: !!document.getElementById("photo-uploads")?.files?.length, created: new Date().toISOString() };
  }

  function saveResume() { try { localStorage.setItem(RESUME_KEY, JSON.stringify(buildResume())); saveReturnPath(); } catch (error) { console.error("Could not preserve quote:", error); } }
  function showStep(number) { const form = document.getElementById("quote-form"); if (!form) return; form.querySelectorAll(".wizard-step").forEach(step => { step.hidden = Number(step.dataset.step) !== number; }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function prepareManual(step) { if (!step) return; const fieldset = step.querySelector("fieldset"); if (fieldset) fieldset.hidden = true; step.querySelectorAll("#address-line-1, #address-line-2, #city, #county, #postcode").forEach(input => { input.required = false; input.value = ""; }); if (!step.querySelector(".manual-address-notice")) { const notice = document.createElement("div"); notice.className = "manual-address-notice notice"; notice.innerHTML = "<strong>Address not required yet.</strong> Your full return address will only be requested if a purchase offer is made and you choose to proceed."; const phone = step.querySelector("#phone-number"); if (phone?.parentNode) phone.parentNode.insertBefore(notice, phone.nextSibling); } }
  function restoreResume() { const saved = getResume(); if (!saved) return; const step = document.querySelector('#quote-form .wizard-step[data-step="13"]'); if (!step) return; const notice = document.createElement("div"); notice.className = "quote-restored-notice notice"; notice.innerHTML = "<strong>Your valuation has been saved.</strong> We restored your quote so you do not need to start again."; const first = step.querySelector("#full-name"); if (first?.parentNode && !step.querySelector(".quote-restored-notice")) first.parentNode.insertBefore(notice, first); if (saved.manualValuation) prepareManual(step); showStep(13); window.setTimeout(() => { window.actionBuyerAuth?.prefillQuoteCustomerDetails?.(); }, 100); }

  function makeRecord(saved) {
    const value = id => document.getElementById(id)?.value.trim() || "";
    return { manufacturer: saved.manufacturer, model: saved.model, package: saved.package, condition: saved.condition, flightHours: saved.flightHours, flightHoursRange: saved.flightHoursRange, batteries: saved.batteries, unbound: saved.unbound, damage: saved.damage, damageDescription: saved.damageDescription, packageContents: saved.packageContents, additionalAccessories: [], droneSerial: saved.droneSerial, controllerSerial: saved.controllerSerial, photos: [], legalRight: saved.legalRight, fullName: value("full-name"), email: value("email-address"), phone: value("phone-number"), addressLine1: value("address-line-1"), addressLine2: value("address-line-2"), city: value("city"), county: value("county"), postcode: value("postcode").toUpperCase(), bankName: "", accountNumber: "", sortCode: "", quoteAmount: saved.manualValuation ? null : saved.quoteAmount, quoteReference: "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000), category: saved.category, categoryName: saved.categoryName, manufacturerName: saved.manufacturerName, modelName: saved.modelName, packageName: saved.packageName, resumedAfterLogin: true, created: new Date().toISOString() };
  }
  function saveLocal(record) { try { localStorage.setItem("wba_latest_quote", JSON.stringify(record)); } catch (_) {} }

  async function saveQuoteToAccount() {
    let saved = null; try { saved = JSON.parse(localStorage.getItem("wba_latest_quote") || "null"); } catch (_) {}
    if (!saved || !saved.quoteReference || !window.actionBuyerAuth?.supabase) return;
    const { data, error } = await window.actionBuyerAuth.supabase.auth.getUser(); if (error || !data?.user) return;
    const record = { user_id: data.user.id, quote_reference: saved.quoteReference, status: saved.quoteAmount === null || saved.quoteAmount === undefined ? "manual_review" : "valued", manufacturer: saved.manufacturer || null, model: saved.model || null, package: saved.package || null, condition: saved.condition || null, quote_amount: saved.quoteAmount === null || saved.quoteAmount === undefined ? null : Number(saved.quoteAmount), quote_data: { ...saved, photos: [], bankName: undefined, accountNumber: undefined, sortCode: undefined } };
    const result = await window.actionBuyerAuth.supabase.from("valuations").upsert(record, { onConflict: "quote_reference" });
    if (result.error) { console.error("Could not save valuation to customer account:", result.error); return; }

    /* New valued submissions now create a published automatic offer in the database.
       Trigger the transactional email function immediately; if email credentials are
       not configured yet, the offer remains saved and the queue remains intact. */
    if (record.quote_amount != null) {
      const { data: valuation } = await window.actionBuyerAuth.supabase.from("valuations").select("id").eq("quote_reference", record.quote_reference).maybeSingle();
      if (valuation?.id) {
        const { data: item } = await window.actionBuyerAuth.supabase.from("quote_items").select("id").eq("valuation_id", valuation.id).maybeSingle();
        if (item?.id) {
          const { data: offer } = await window.actionBuyerAuth.supabase.from("quote_offers").select("id,status").eq("item_id", item.id).eq("offer_type", "automatic").eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (offer?.id) { try { await window.actionBuyerAuth.supabase.functions.invoke("send-quote-email", { body: { offer_id: offer.id, event_type: "offer_published" } }); } catch (_) {} }
        }
      }
    }
  }

  function showSubmitted(record) { const step = document.querySelector('#quote-form .wizard-step[data-step="14"]'); if (!step) return; document.querySelectorAll("#quote-form .wizard-step").forEach(s => { s.hidden = s !== step; }); const heading = step.querySelector("h3"); if (heading) heading.textContent = record.quoteAmount == null ? "Manual Valuation Submitted" : "Quote Submitted"; const ref = step.querySelector("#quote-reference"); if (ref) ref.textContent = record.quoteReference; const nav = step.querySelector(".navigation-buttons"); if (nav) nav.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>'; }
  function isManualStep12(step) { return /manual valuation|manual validation/i.test(step?.querySelector("h3")?.textContent || "") || !!step?.querySelector('#continue-with-quote[data-quote-action="manual"]'); }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form"); if (!form) return;
    window.setTimeout(restoreResume, 300);
    form.addEventListener("click", function (event) {
      const button = event.target.closest("button"); if (!button) return; const step = button.closest(".wizard-step"); if (!step) return; const n = Number(step.dataset.step);
      if (n === 12 && isManualStep12(step)) { try { sessionStorage.setItem("actionBuyerManualValuation", "true"); } catch (_) {} return; }
      if (n !== 13 || !button.classList.contains("btn-next")) return;
      const resumed = getResume(); const authenticated = getSessionMarker();
      if (resumed) { event.preventDefault(); event.stopImmediatePropagation(); (async function () { if (!(await window.actionBuyerAuth?.getSession?.())) { saveResume(); saveReturnPath(); window.location.href = "login.html?return=quote.html"; return; } const name = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number"); if (!name?.value.trim()) return alert("Please enter your full name."); if (!email?.value.trim()) return alert("Please enter your email address."); if (!phone?.value.trim()) return alert("Please enter your telephone number."); const record = makeRecord(resumed); saveLocal(record); await saveQuoteToAccount(); clearResume(); clearReturnPath(); try { sessionStorage.removeItem("actionBuyerManualValuation"); } catch (_) {} showSubmitted(record); })(); return; }
      if (!authenticated) { event.preventDefault(); event.stopImmediatePropagation(); saveResume(); saveReturnPath(); window.location.href = "login.html?return=quote.html"; return; }
      try { if (sessionStorage.getItem("actionBuyerManualValuation") === "true") { event.preventDefault(); event.stopImmediatePropagation(); prepareManual(step); const name = document.getElementById("full-name"), email = document.getElementById("email-address"), phone = document.getElementById("phone-number"); if (!name?.value.trim()) return alert("Please enter your full name."); if (!email?.value.trim()) return alert("Please enter your email address."); if (!phone?.value.trim()) return alert("Please enter your telephone number."); const manual = buildResume(); manual.manualValuation = true; manual.quoteAmount = null; const record = makeRecord(manual); saveLocal(record); saveQuoteToAccount(); sessionStorage.removeItem("actionBuyerManualValuation"); showSubmitted(record); } } catch (_) {}
    }, true);
  });

  window.gearCashOutSaveQuoteToAccount = saveQuoteToAccount;
  (function () { const load = function () { if (document.querySelector('script[data-gear-enhancements]')) return; const script = document.createElement("script"); script.src = "quote-enhancements.js"; script.defer = true; script.dataset.gearEnhancements = "true"; document.head.appendChild(script); }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load(); })();
  (function () { const load = function () { if (document.querySelector('script[data-multi-item-quote]')) return; const script = document.createElement("script"); script.src = "multi-item-quote.js"; script.defer = true; script.dataset.multiItemQuote = "true"; document.head.appendChild(script); }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true }); else load(); })();
})();
