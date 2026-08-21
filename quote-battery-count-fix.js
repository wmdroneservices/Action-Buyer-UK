/* GearCashOut - package battery count fix.
   Step 6 is only required for DJI drones, where battery type and cycle count
   are relevant to valuation. Other equipment bypasses Step 6 completely.
*/
(function () {
  "use strict";

  function init() {
    const form = document.getElementById("quote-form");
    if (!form) return;

    function isBatteryCycleRelevant() {
      const category = String(document.getElementById("gear-category")?.value || "").toLowerCase();
      const manufacturer = String(document.getElementById("gear-manufacturer")?.value || "").toLowerCase();
      return category === "drone" && manufacturer === "dji";
    }

    function expected() {
      return Math.max(1, Number(window.gearExpectedPackageBatteries?.() || 1));
    }

    function getStep6() {
      return form.querySelector('.wizard-step[data-step="6"]');
    }

    function createStep6() {
      let step6 = getStep6();
      if (step6) return step6;
      step6 = document.createElement("section");
      step6.className = "wizard-step";
      step6.dataset.step = "6";
      step6.hidden = true;
      step6.innerHTML = `
        <h3>Step 6: Package Batteries</h3>
        <p class="battery-package-note"></p>
        <label for="package-battery-count">Number of package batteries being supplied</label>
        <select id="package-battery-count"></select>
        <div id="batteries-container"></div>
        <label for="battery-cycle-photo">Battery cycle photograph / screenshot</label>
        <input type="file" id="battery-cycle-photo" accept="image/*" multiple>
        <div class="navigation-buttons">
          <button type="button" class="btn btn-back">Back</button>
          <button type="button" class="btn btn-next">Next</button>
        </div>`;
      const step5 = form.querySelector('.wizard-step[data-step="5"]');
      if (step5 && step5.nextSibling) form.insertBefore(step6, step5.nextSibling);
      else form.appendChild(step6);
      return step6;
    }

    function snapshotEntries() {
      const result = {};
      form.querySelectorAll("#batteries-container .battery-entry").forEach(function (entry) {
        const n = entry.dataset.number;
        result[n] = {
          type: entry.querySelector(".battery-type")?.value || "",
          cycles: entry.querySelector(".battery-cycles")?.value || ""
        };
      });
      return result;
    }

    function renderEntries(count) {
      const step6 = createStep6();
      const container = step6.querySelector("#batteries-container");
      const saved = snapshotEntries();
      container.innerHTML = "";
      for (let i = 1; i <= count; i++) {
        const old = saved[String(i)] || {};
        const entry = document.createElement("div");
        entry.className = "battery-entry";
        entry.dataset.number = String(i);
        entry.innerHTML = `
          <h4>Package Battery ${i}</h4>
          <label for="battery-type-${i}">Battery Type</label>
          <input type="text" id="battery-type-${i}" class="battery-type" placeholder="Example: Intelligent Flight Battery" value="${escapeHtml(old.type)}">
          <label for="battery-cycles-${i}">Battery Cycle Count</label>
          <input type="number" id="battery-cycles-${i}" class="battery-cycles" min="0" step="1" placeholder="0" value="${escapeHtml(old.cycles)}">
        `;
        container.appendChild(entry);
      }
    }

    function syncUI() {
      if (!isBatteryCycleRelevant()) return;
      const step6 = createStep6();
      const allowance = expected();
      const select = step6.querySelector("#package-battery-count");
      const previous = Number(select.value || Math.min(allowance, 1));
      select.innerHTML = "";
      for (let i = 1; i <= allowance; i++) {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = String(i);
        select.appendChild(option);
      }
      select.value = String(Math.min(Math.max(previous, 1), allowance));
      step6.querySelector(".battery-package-note").innerHTML =
        `The selected package contains <strong>${allowance}</strong> battery${allowance === 1 ? "" : "ies"}. Select how many of those package batteries you are actually supplying. Any extra batteries are entered separately as accessories.`;
      renderEntries(Number(select.value));
    }

    function skipStep6ForNonDJI() {
      const step6 = getStep6();
      if (!step6 || isBatteryCycleRelevant()) return false;
      step6.hidden = true;
      const step7 = form.querySelector('.wizard-step[data-step="7"]');
      if (step7) {
        form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== step7; });
        setTimeout(function () {
          const next = step7.querySelector(".btn-next");
          if (next && !step7.dataset.batteryStepSkipped) {
            step7.dataset.batteryStepSkipped = "1";
            next.click();
          }
        }, 0);
      }
      return true;
    }

    const step6 = createStep6();
    if (isBatteryCycleRelevant()) syncUI();
    else step6.hidden = true;

    step6.addEventListener("change", function (event) {
      if (event.target.id === "package-battery-count" && isBatteryCycleRelevant()) {
        renderEntries(Number(event.target.value));
      }
    });

    /* Capture the Step 5 transition. Only DJI drones enter Step 6. */
    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !button.classList.contains("btn-next")) return;
      const step = button.closest(".wizard-step");
      if (!step || Number(step.dataset.step) !== 5) return;

      if (!isBatteryCycleRelevant()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        skipStep6ForNonDJI();
        return;
      }

      setTimeout(function () {
        const s6 = getStep6();
        if (s6) {
          syncUI();
          form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== s6; });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 0);
    }, true);

    /* Replace the old battery validation for Step 6 with the count-based UI. */
    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button || !button.classList.contains("btn-next")) return;
      const step = button.closest(".wizard-step");
      if (!step || Number(step.dataset.step) !== 6) return;
      if (!isBatteryCycleRelevant()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        skipStep6ForNonDJI();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const entries = Array.from(step.querySelectorAll(".battery-entry"));
      if (!entries.length) { alert("Please select at least one package battery."); return; }
      for (const entry of entries) {
        if (!entry.querySelector(".battery-type")?.value.trim()) { alert(`Please enter the battery type for Package Battery ${entry.dataset.number}.`); return; }
        const cycles = entry.querySelector(".battery-cycles")?.value;
        if (cycles === "" || Number(cycles) < 0 || !Number.isFinite(Number(cycles))) { alert(`Please enter a valid cycle count for Package Battery ${entry.dataset.number}.`); return; }
      }
      const s7 = form.querySelector('.wizard-step[data-step="7"]');
      if (s7) {
        form.querySelectorAll(".wizard-step").forEach(function (s) { s.hidden = s !== s7; });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, true);

    /* If package/model/category changes, reset the count to the new package allowance. */
    form.addEventListener("change", function (event) {
      if (event.target.id === "package-select" || event.target.id === "dji-model" || event.target.id === "gear-category" || event.target.id === "gear-manufacturer") {
        setTimeout(function () {
          const s6 = createStep6();
          if (!isBatteryCycleRelevant()) {
            s6.hidden = true;
            return;
          }
          const allowance = expected();
          const select = s6.querySelector("#package-battery-count");
          select.innerHTML = "";
          for (let i = 1; i <= allowance; i++) select.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`);
          select.value = "1";
          renderEntries(1);
          s6.querySelector(".battery-package-note").innerHTML = `The selected package contains <strong>${allowance}</strong> battery${allowance === 1 ? "" : "ies"}. Select how many of those package batteries you are actually supplying. Any extra batteries are entered separately as accessories.`;
        }, 0);
      }
    });

    const observer = new MutationObserver(function () {
      if (!isBatteryCycleRelevant()) skipStep6ForNonDJI();
    });
    observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
