/* GearCashOut front-end enhancements. The verified DJI quote engine remains the pricing source. */
(function () {
  "use strict";

  const EXTRA_VALUES = { battery: 30, controller: 50, hardCase: 25, charger: 10, hub: 20, propellers: 5, small: 2 };
  let catalog = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const step = n => $(`#quote-form .wizard-step[data-step="${n}"]`);

  function category() { return $("#gear-category")?.value || "Drone"; }
  function manufacturer() { return $("#gear-manufacturer")?.value || ""; }
  function models() { return catalog?.[category()]?.[manufacturer()] || []; }

  function setupStep1() {
    const s = step(1);
    if (!s || s.dataset.gearCatalogReady) return;
    s.dataset.gearCatalogReady = "true";
    s.innerHTML = `
      <h3>Step 1: Equipment &amp; Manufacturer</h3>
      <p>First tell us what you are selling, then select the manufacturer.</p>
      <label for="gear-category">Equipment type</label>
      <select id="gear-category"><option value="">-- Select equipment type --</option></select>
      <label for="gear-manufacturer">Manufacturer</label>
      <select id="gear-manufacturer" disabled><option value="">-- Select manufacturer --</option></select>
      <input type="radio" name="manufacturer" value="dji" checked hidden>
      <div class="navigation-buttons"><button type="button" class="btn btn-next">Next</button></div>`;

    const cat = $("#gear-category");
    Object.keys(catalog).forEach(name => cat.add(new Option(name, name)));
    cat.addEventListener("change", () => {
      populateManufacturers();
      setupCategoryFields();
      const m = $("#dji-model");
      if (m) m.innerHTML = '<option value="">-- Select model --</option>';
    });
    $("#gear-manufacturer").addEventListener("change", () => {
      populateModels();
      setupCategoryFields();
    });
    cat.value = "Drone";
    populateManufacturers();
  }

  function populateManufacturers() {
    const select = $("#gear-manufacturer");
    if (!select) return;
    const names = Object.keys(catalog?.[category()] || {});
    select.disabled = !category();
    select.innerHTML = '<option value="">-- Select manufacturer --</option>';
    names.forEach(name => select.add(new Option(name, name)));
  }

  function populateModels() {
    const select = $("#dji-model");
    if (!select) return;
    const list = models();
    select.innerHTML = '<option value="">-- Select model --</option>';
    list.forEach(([id, name]) => select.add(new Option(name, id)));
  }

  function setupStep2() {
    const s = step(2);
    const label = s?.querySelector('label[for="dji-model"]');
    if (label) label.textContent = "Select your model";
  }

  function setupCategoryFields() {
    const nonDrone = category() !== "Drone";
    const s5 = step(5);
    if (s5) {
      const h = s5.querySelector("h3");
      if (h) h.textContent = nonDrone ? "Step 5: Usage Information" : "Step 5: Flight Time";
      const flight = $("#flight-hours");
      if (flight) flight.hidden = nonDrone;
      const range = $('input[name="flightHoursRange"][value="0-5"]');
      if (range) {
        range.checked = nonDrone;
        const label = range.closest("label");
        if (label) label.hidden = nonDrone;
      }
      let usage = $("#gear-usage-count", s5);
      if (nonDrone && !usage) {
        const wrap = document.createElement("div");
        wrap.id = "gear-usage-count-wrap";
        wrap.innerHTML = '<label for="gear-usage-count">Shutter / usage count, if known</label><input type="number" id="gear-usage-count" min="0" step="1" placeholder="Optional"><p>Leave blank if the equipment has no usage counter.</p>';
        s5.insertBefore(wrap, s5.querySelector(".navigation-buttons"));
      }
      if (!nonDrone && $("#gear-usage-count-wrap", s5)) $("#gear-usage-count-wrap", s5).hidden = true;
    }
    if (nonDrone) {
      const s7 = step(7);
      if (s7) {
        const yes = $('input[name="unbound"][value="yes"]', s7);
        if (yes) yes.checked = true;
      }
    }
  }

  function expectedPackageBatteries() {
    const key = `${$("#dji-model")?.value || ""}|${$("#package-select")?.value || ""}`;
    const known = {
      "mini-5-pro|fly-more-rc-2": 3, "mini-4-pro|fly-more-rc-2": 3, "mini-4-pro|fly-more-rc-n2": 3,
      "mini-3-pro|fly-more-rc-n1": 3, "mini-3-pro|fly-more-dji-rc": 3, "mini-3|fly-more-rc-n1": 3,
      "mini-2|fly-more": 3, "neo|drone-only": 1, "neo|fly-more": 3, "neo-2|standard": 1, "neo-2|fly-more": 3,
      "flip|standard-rc-n3": 1, "flip|fly-more-rc-n3": 3, "flip|fly-more-rc-2": 3,
      "air|drone-only": 1, "air|standard": 1, "air|fly-more": 3, "air-2|drone-only": 1, "air-2|fly-more": 3,
      "air-2s|drone-only": 1, "air-2s|fly-more": 3, "air-3|drone-only": 1, "air-3|fly-more": 3,
      "air-3s|drone-only": 1, "air-3s|fly-more": 3, "mavic-2-pro|drone-only": 1, "mavic-2-pro|standard": 1,
      "mavic-2-pro|fly-more": 3, "mavic-2-zoom|drone-only": 1, "mavic-2-zoom|fly-more": 3,
      "mavic-3|drone-only": 1, "mavic-3|fly-more": 3, "mavic-3-classic|drone-only": 1, "mavic-3-classic|fly-more": 3,
      "mavic-3-pro|drone-only": 1, "mavic-3-pro|fly-more": 3, "mavic-3-pro-cine|drone-only": 1,
      "mavic-3-pro-cine|premium-combo": 3, "mavic-4-pro|drone-only": 1, "mavic-4-pro|fly-more": 3,
      "fpv|drone-only": 1, "fpv|fly-smart": 1, "avata|drone-only": 1, "avata|fly-smart": 2,
      "avata|pro-view": 2, "avata|explorer": 2, "avata-2|drone-only": 1, "avata-2|fly-more": 3
    };
    return known[key] || 1;
  }

  function skipBatteryPage() {
    const s = step(6);
    if (!s || s.dataset.gearBatterySkipped) return;
    s.dataset.gearBatterySkipped = "true";
    const container = $("#batteries-container", s);
    if (container) {
      container.innerHTML = "";
      for (let i = 1; i <= expectedPackageBatteries(); i++) {
        const entry = document.createElement("div");
        entry.className = "battery-entry";
        entry.innerHTML = `<input type="text" class="battery-type" value="Package battery ${i}"><input type="number" class="battery-cycles" value="0">`;
        container.appendChild(entry);
      }
    }
    s.hidden = true;
    setTimeout(() => s.querySelector(".btn-next")?.click(), 20);
  }

  function skipUnboundForNonDrone() {
    if (category() === "Drone") return;
    const s = step(7);
    if (!s || s.dataset.gearUnboundSkipped) return;
    s.dataset.gearUnboundSkipped = "true";
    const yes = $('input[name="unbound"][value="yes"]', s);
    if (yes) yes.checked = true;
    s.hidden = true;
    setTimeout(() => s.querySelector(".btn-next")?.click(), 20);
  }

  function packageItems() {
    if (category() === "Action Camera") return [["camera","Camera"],["battery-1","Battery"],["charger","Charger"],["cables","Cables"],["case","Protective case"],["mounts","Mounts / brackets"],["accessories","Standard accessories"]];
    if (category() === "Camera") return [["camera","Camera body"],["battery-1","Battery"],["charger","Charger"],["cables","Cables"],["strap","Strap"],["case","Body cap / case"],["accessories","Standard accessories"]];
    if (category() === "Camera Lens") return [["lens","Lens"],["caps","Front / rear caps"],["hood","Lens hood"],["case","Case / pouch"],["accessories","Standard accessories"]];
    if (category() === "Accessory") return [["item","Main item"],["charger","Charger / power supply"],["cables","Cables"],["case","Case / packaging"],["accessories","Standard accessories"]];
    const n = expectedPackageBatteries();
    const items = [["drone","Drone"],["controller","Controller"]];
    for (let i = 1; i <= n; i++) items.push([`battery-${i}`, `Battery ${i}`]);
    items.push(["charging-hub","Charging Hub"],["bag","Carry case / bag"],["propellers","Propellers / wings"],["power-supply","Power Supply"],["cables","Cables"]);
    return items;
  }

  function populatePackageContents() {
    const box = $("#package-contents-list");
    if (!box) return;
    box.innerHTML = "";
    packageItems().forEach(([id, name]) => {
      const row = document.createElement("div");
      row.className = "package-content-row";
      row.innerHTML = `<label for="contents-${id}">${name}</label><select id="contents-${id}" class="package-content-select" data-content-id="${id}"><option value="">-- Select status --</option><option value="present">Present</option><option value="missing">Missing</option></select>`;
      box.appendChild(row);
    });
  }

  function setupAdditionalItems() {
    const s = step(10);
    if (!s || s.dataset.gearAdditionalReady) return;
    s.dataset.gearAdditionalReady = "true";
    s.innerHTML = `
      <h3>Step 10: Additional Items</h3>
      <p>Add items that are <strong>not part of the selected package</strong>.</p>
      <label>Additional batteries <select id="extra-battery-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      <div id="extra-battery-cycles"></div>
      <label>Additional controllers <select id="extra-controller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
      <label>Additional hard cases <select id="extra-hardcase-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
      <label>Additional chargers <select id="extra-charger-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
      <label>Additional charging hubs <select id="extra-hub-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
      <label>Additional propellers / wings <select id="extra-propeller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></label>
      <label>Other small accessories <select id="extra-small-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></label>
      <hr>
      <h4>Serial Numbers</h4>
      <label for="drone-serial-number">Equipment Serial Number</label>
      <input type="text" id="drone-serial-number" maxlength="50" required placeholder="Enter serial number">
      <label for="controller-serial-number">Controller Serial Number (if applicable)</label>
      <input type="text" id="controller-serial-number" maxlength="50" placeholder="If applicable">
      <p>Serial numbers may be checked during inspection and ownership verification.</p>
      <div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>`;
  }

  function extras() {
    const n = id => Number($("#" + id)?.value || 0);
    return {
      batteries: n("extra-battery-count"), controllers: n("extra-controller-count"), hardCases: n("extra-hardcase-count"),
      chargers: n("extra-charger-count"), hubs: n("extra-hub-count"), propellers: n("extra-propeller-count"), small: n("extra-small-count"),
      cycles: $$(".extra-battery-cycle").map(i => Math.max(0, Number(i.value) || 0))
    };
  }

  function updateBatteryCycles() {
    const count = Number($("#extra-battery-count")?.value || 0);
    const box = $("#extra-battery-cycles");
    if (!box) return;
    box.innerHTML = "";
    for (let i = 1; i <= count; i++) box.insertAdjacentHTML("beforeend", `<label>Additional battery ${i} cycle count <input type="number" class="extra-battery-cycle" min="0" value="0"></label>`);
  }

  function missingPackageBatteries() {
    return $$('.package-content-select[data-content-id^="battery-"]').filter(s => s.value === "missing").length;
  }

  function cycleDeduction(cycles) {
    return cycles.reduce((sum, c) => c <= 50 ? sum : c <= 100 ? sum + 5 : c <= 200 ? sum + 15 : c <= 300 ? sum + 30 : sum + 50, 0);
  }

  function additionalValue(x) {
    return x.batteries * EXTRA_VALUES.battery + x.controllers * EXTRA_VALUES.controller + x.hardCases * EXTRA_VALUES.hardCase + x.chargers * EXTRA_VALUES.charger + x.hubs * EXTRA_VALUES.hub + x.propellers * EXTRA_VALUES.propellers + x.small * EXTRA_VALUES.small;
  }

  function adjustDjiQuote() {
    if (category() !== "Drone" || manufacturer() !== "DJI") return;
    const result = step(12);
    const price = $(".quote-price", result);
    if (!price) return;
    const base = Number(price.textContent.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(base)) return;
    const x = extras();
    const missingBattery = missingPackageBatteries() * EXTRA_VALUES.battery;
    const cycles = cycleDeduction(x.cycles);
    const additions = additionalValue(x);
    const adjusted = Math.max(0, base - missingBattery - cycles + additions);
    price.textContent = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(adjusted);
    const batteryLine = $$("p", result).find(p => p.textContent.includes("Batteries:"));
    if (batteryLine) batteryLine.innerHTML = `<strong>Batteries:</strong> ${expectedPackageBatteries() + x.batteries}`;
    let note = $(".gear-adjustment-note", result);
    if (!note) { note = document.createElement("p"); note.className = "gear-adjustment-note"; $(".quote-price-box", result)?.appendChild(note); }
    const changes = [];
    if (missingBattery) changes.push(`${missingPackageBatteries()} missing package battery${missingPackageBatteries() === 1 ? "" : "ies"}: -£${missingBattery}`);
    if (cycles) changes.push(`additional battery cycle adjustment: -£${cycles}`);
    if (additions) changes.push(`additional equipment: +£${additions}`);
    note.textContent = changes.length ? changes.join(" • ") : "No package-content or additional-item adjustment applied.";
    window.__gearCashOutAdjustedQuote = adjusted;
  }

  function persistQuote() {
    const amount = window.__gearCashOutAdjustedQuote;
    try {
      const raw = localStorage.getItem("wba_latest_quote");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Number.isFinite(amount)) saved.quoteAmount = amount;
      saved.equipmentCategory = category();
      saved.equipmentManufacturer = manufacturer();
      saved.equipmentModel = $("#dji-model")?.selectedOptions?.[0]?.textContent || "";
      saved.additionalAccessories = extras();
      localStorage.setItem("wba_latest_quote", JSON.stringify(saved));
    } catch (e) { console.warn("GearCashOut quote enhancement save failed", e); }
  }

  function progressLabels() {
    const p = $$("#progress-indicator .progress-step");
    if (p[0]) p[0].textContent = "1. Equipment & Manufacturer";
    if (p[1]) p[1].textContent = "2. Model";
    if (p[5]) { p[5].textContent = "6. Package Batteries"; p[5].hidden = true; }
    if (p[9]) p[9].textContent = "10. Additional Items";
  }

  async function init() {
    try {
      catalog = await fetch("gear-catalog.json", { cache: "no-store" }).then(r => r.json());
    } catch (e) {
      console.error("GearCashOut catalog could not be loaded", e);
      return;
    }

    setupStep1();
    setupStep2();
    setupAdditionalItems();
    progressLabels();

    const form = $("#quote-form");
    const observer = new MutationObserver(() => {
      const s6 = step(6);
      if (s6 && !s6.hidden) skipBatteryPage();
      const s7 = step(7);
      if (s7 && !s7.hidden && category() !== "Drone") skipUnboundForNonDrone();
      const s9 = step(9);
      if (s9 && !s9.hidden) setTimeout(populatePackageContents, 10);
      const s12 = step(12);
      if (s12 && !s12.hidden) setTimeout(adjustDjiQuote, 30);
    });
    observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

    document.addEventListener("change", event => {
      if (event.target.id === "extra-battery-count") updateBatteryCycles();
      if (event.target.id === "package-select") setTimeout(populatePackageContents, 20);
      if (event.target.id === "gear-category") { populateManufacturers(); setupCategoryFields(); }
      if (event.target.id === "gear-manufacturer") { populateModels(); setupCategoryFields(); }
    });

    document.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      const s = button.closest(".wizard-step");
      if (!s) return;
      const n = Number(s.dataset.step);
      if (n === 9 && button.classList.contains("btn-next")) setTimeout(adjustDjiQuote, 100);
      if (n === 10 && button.classList.contains("btn-next")) setTimeout(adjustDjiQuote, 100);
      if (n === 13 && button.classList.contains("btn-next")) setTimeout(persistQuote, 100);
    });

    setupCategoryFields();
  }

  document.addEventListener("DOMContentLoaded", init);
})();