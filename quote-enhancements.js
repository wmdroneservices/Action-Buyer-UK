/* GearCashOut quote enhancements. Keeps the existing quote engine intact while
   separating package contents from additional items and correcting the related
   valuation adjustments. */
(function () {
  "use strict";
  const EXTRA_VALUES = { battery: 30, controller: 50, hardCase: 25, charger: 10, chargingHub: 20, propellers: 5 };
  function packageBatteryCount() {
    const model = document.getElementById("dji-model")?.value || "";
    const pkg = document.getElementById("package-select")?.value || "";
    const known = {"mini-5-pro|fly-more-rc-2":3,"mini-4-pro|fly-more-rc-2":3,"mini-4-pro|fly-more-rc-n2":3,"mini-3-pro|fly-more-rc-n1":3,"mini-3-pro|fly-more-dji-rc":3,"mini-3|fly-more-rc-n1":3,"mini-2|fly-more":3,"neo|drone-only":1,"neo|fly-more":3,"neo-2|standard":1,"neo-2|fly-more":3,"flip|standard-rc-n3":1,"flip|fly-more-rc-n3":3,"flip|fly-more-rc-2":3,"air|drone-only":1,"air|standard":1,"air|fly-more":3,"air-2|drone-only":1,"air-2|fly-more":3,"air-2s|drone-only":1,"air-2s|fly-more":3,"air-3|drone-only":1,"air-3|fly-more":3,"air-3s|drone-only":1,"air-3s|fly-more":3,"mavic-2-pro|drone-only":1,"mavic-2-pro|standard":1,"mavic-2-pro|fly-more":3,"mavic-2-zoom|drone-only":1,"mavic-2-zoom|fly-more":3,"mavic-3|drone-only":1,"mavic-3|fly-more":3,"mavic-3-classic|drone-only":1,"mavic-3-classic|fly-more":3,"mavic-3-pro|drone-only":1,"mavic-3-pro|fly-more":3,"mavic-3-pro-cine|drone-only":1,"mavic-3-pro-cine|premium-combo":3,"mavic-4-pro|drone-only":1,"mavic-4-pro|fly-more":3,"fpv|drone-only":1,"fpv|fly-smart":1,"avata|drone-only":1,"avata|fly-smart":2,"avata|pro-view":2,"avata|explorer":2,"avata-2|drone-only":1,"avata-2|fly-more":3};
    return known[model + "|" + pkg] || 1;
  }
  function step(number) { return document.querySelector('#quote-form .wizard-step[data-step="' + number + '"]'); }
  function rebuildStep6() {
    const s = step(6); if (!s || s.dataset.gearCashoutEnhanced === "true") return; s.dataset.gearCashoutEnhanced = "true";
    s.innerHTML = `<h3>Step 6: Battery Information</h3><p><strong>Package batteries are handled in Package Contents.</strong></p><p>We will check the batteries that belong to your selected package in Step 9. You do not need to enter those batteries again here.</p><p>Any batteries that are <strong>additional to the selected package</strong> can be added in Step 10, along with their cycle counts.</p><div id="batteries-container" aria-hidden="true" style="display:none"></div><button type="button" class="btn btn-add" id="add-battery-btn" style="display:none">Add Battery</button><div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;
  }
  function seedPackageBatteryPlaceholders() {
    const container = document.getElementById("batteries-container"); if (!container) return; const count = packageBatteryCount(); container.innerHTML = "";
    for (let i = 1; i <= count; i++) { const entry = document.createElement("div"); entry.className = "battery-entry"; entry.dataset.number = String(i); entry.innerHTML = `<input type="text" class="battery-type" value="Package battery ${i}"><input type="number" class="battery-cycles" value="0">`; container.appendChild(entry); }
  }
  function rebuildStep10() {
    const s = step(10); if (!s || s.dataset.gearCashoutEnhanced === "true") return; s.dataset.gearCashoutEnhanced = "true";
    s.innerHTML = `<h3>Step 10: Additional Items &amp; Serial Numbers</h3><p>Now that we have checked what belongs to your selected package, tell us about anything <strong>extra</strong> that is not part of that package.</p><fieldset><legend>Additional items</legend><label>Additional batteries<select id="extra-battery-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label><div id="extra-battery-cycles"></div><label>Additional controllers<select id="extra-controller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label><label>Additional hard cases<select id="extra-hardcase-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label><label>Additional chargers<select id="extra-charger-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label><label>Additional charging hubs<select id="extra-hub-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label><label>Additional propellers / wings<select id="extra-propeller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></label></fieldset><hr><h4>Serial Numbers</h4><label for="drone-serial-number">Drone Serial Number</label><input type="text" id="drone-serial-number" maxlength="50" required><label for="controller-serial-number">Controller Serial Number</label><input type="text" id="controller-serial-number" maxlength="50"><p>Serial numbers may be checked during inspection and ownership verification.</p><div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;
    updateExtraBatteryFields();
  }
  function updateExtraBatteryFields() {
    const select = document.getElementById("extra-battery-count"), box = document.getElementById("extra-battery-cycles"); if (!select || !box) return; const count = Number(select.value) || 0; box.innerHTML = "";
    for (let i = 1; i <= count; i++) box.insertAdjacentHTML("beforeend", `<label>Additional battery ${i} cycle count<input type="number" class="extra-battery-cycle" min="0" step="1" value="0"></label>`);
  }
  function readExtras() {
    const qty = id => Number(document.getElementById(id)?.value || 0); const propellers = qty("extra-propeller-count");
    const extra = { batteries:qty("extra-battery-count"), controllers:qty("extra-controller-count"), hardCases:qty("extra-hardcase-count"), chargers:qty("extra-charger-count"), hubs:qty("extra-hub-count"), propellers:propellers === 3 ? 3 : propellers };
    extra.batteryCycles = Array.from(document.querySelectorAll(".extra-battery-cycle")).map(i => Math.max(0, Number(i.value) || 0)); return extra;
  }
  function getMissingPackageBatteries() { return Array.from(document.querySelectorAll(".package-content-select[data-content-id^=\"battery-\"]")).filter(s => s.value === "missing").length; }
  function extraValue(extras) { return (extras.batteries*EXTRA_VALUES.battery)+(extras.controllers*EXTRA_VALUES.controller)+(extras.hardCases*EXTRA_VALUES.hardCase)+(extras.chargers*EXTRA_VALUES.charger)+(extras.hubs*EXTRA_VALUES.chargingHub)+(extras.propellers*EXTRA_VALUES.propellers); }
  function batteryCycleDeduction(extras) { return extras.batteryCycles.reduce((sum,cycles)=>cycles<=50?sum:cycles<=100?sum+5:cycles<=200?sum+15:cycles<=300?sum+30:sum+50,0); }
  function adjustResult() {
    const resultStep = step(12); if (!resultStep || resultStep.hidden) return; const priceEl = resultStep.querySelector(".quote-price"); if (!priceEl) return;
    const raw = priceEl.textContent.replace(/[^0-9.]/g, ""), base = Number(raw); if (!Number.isFinite(base)) return;
    const extras = readExtras(), missingBatteries = getMissingPackageBatteries(), cycleDeduction = batteryCycleDeduction(extras), adjusted = Math.max(0, base-(missingBatteries*EXTRA_VALUES.battery)-cycleDeduction+extraValue(extras));
    priceEl.textContent = new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(adjusted);
    const batteryLine = Array.from(resultStep.querySelectorAll("p")).find(p=>p.textContent.includes("Batteries:")); if (batteryLine) batteryLine.innerHTML = `<strong>Batteries:</strong> ${packageBatteryCount()+extras.batteries}`;
    let note = resultStep.querySelector(".gear-adjustment-note"); if (!note) { note=document.createElement("p"); note.className="gear-adjustment-note"; const priceBox=resultStep.querySelector(".quote-price-box"); if(priceBox) priceBox.appendChild(note); }
    if(note){const changes=[]; if(missingBatteries) changes.push(`${missingBatteries} missing package battery${missingBatteries===1?"":"ies"}: -£${missingBatteries*EXTRA_VALUES.battery}`); if(cycleDeduction) changes.push(`additional battery cycle adjustment: -£${cycleDeduction}`); const addValue=extraValue(extras); if(addValue) changes.push(`additional equipment: +£${addValue}`); note.textContent=changes.length?changes.join(" • "):"No package-content or additional-item adjustment applied.";}
    window.__gearCashOutAdjustedQuote = adjusted;
  }
  function persistAdjustedQuote() {
    const amount=window.__gearCashOutAdjustedQuote; if(!Number.isFinite(amount)) return; try{const raw=localStorage.getItem("wba_latest_quote"); if(!raw)return; const saved=JSON.parse(raw); saved.quoteAmount=amount; saved.additionalAccessories=readExtras(); localStorage.setItem("wba_latest_quote",JSON.stringify(saved));}catch(e){console.warn("Could not persist GearCashOut adjusted valuation.",e);}
  }
  function standardiseBranding() {
    const progress = document.querySelectorAll("#progress-indicator .progress-step"); if(progress[5]) progress[5].textContent="6. Battery Information"; if(progress[9]) progress[9].textContent="10. Additional Items";
    document.querySelectorAll(".footer-container strong").forEach(el=>{if(/ACTION BUYER UK/i.test(el.textContent))el.textContent="GEARCASHOUT";});
    document.querySelectorAll('.footer-nav a[href="quote.html"]').forEach(el=>el.textContent="Get a Valuation");
  }
  document.addEventListener("DOMContentLoaded", function () {
    standardiseBranding(); rebuildStep6(); rebuildStep10(); seedPackageBatteryPlaceholders();
    const packageSelect=document.getElementById("package-select"); if(packageSelect) packageSelect.addEventListener("change",seedPackageBatteryPlaceholders);
    document.addEventListener("change",function(event){if(event.target.id==="extra-battery-count")updateExtraBatteryFields();});
    const form=document.getElementById("quote-form");
    const observer=new MutationObserver(function(){const result=step(12);if(result&&!result.hidden)setTimeout(adjustResult,20);}); if(form) observer.observe(form,{attributes:true,subtree:true,attributeFilter:["hidden"]});
    document.addEventListener("click",function(event){const button=event.target.closest("button");if(!button)return;const s=button.closest(".wizard-step");if(!s)return;if(Number(s.dataset.step)===10&&button.classList.contains("btn-next"))setTimeout(adjustResult,50);if(Number(s.dataset.step)===13&&button.classList.contains("btn-next"))setTimeout(persistAdjustedQuote,60);});
  });
})();
