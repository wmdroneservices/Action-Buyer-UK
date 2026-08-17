document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;
  let batteryCount = 0;

  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null,
    condition: null,
    flightHours: null,
    flightHoursRange: null,
    batteries: []
  };

  // DJI models catalog (same as before)
  const djiModels = [
    { id: "mini", name: "DJI Mini" },
    { id: "mini-2", name: "DJI Mini 2" },
    { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
  ];

  const packageOptions = {
    "mini": {
      "drone-only": "Drone only",
      "standard": "Standard Package"
    },
    "mini-2": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },
    "mini-5-pro": {
      "drone-only": "Drone only",
      "fly-more-rc-2": "Fly More Combo + RC 2"
    }
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      if (progressList[i]) {
        progressList[i].setAttribute('aria-current', i === index ? 'step' : 'false');
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep1() {
    if (!form.querySelector('input[name="manufacturer"]:checked')) {
      alert("Please select a manufacturer.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!form.elements["djiModel"].value) {
      alert("Please select a DJI model.");
      return false;
    }
    return true;
  }

  function validateStep3() {
    if (!form.elements["package"].value) {
      alert("Please select a package.");
      return false;
    }
    return true;
  }

  function validateStep4() {
    if (!form.querySelector('input[name="condition"]:checked')) {
      alert("Please select the condition.");
      return false;
    }
    return true;
  }

  function validateStep5() {
    const fh = form.elements["flightHours"].value;
    const fhRangeChecked = form.querySelector('input[name="flightHoursRange"]:checked');
    if ((!fh || fh <= 0) && !fhRangeChecked) {
      alert("Please enter flight hours or select a flight hours range.");
      return false;
    }
    return true;
  }

  function validateStep6() {
    if (quoteData.batteries.length === 0) {
      alert("Please add at least one battery.");
      return false;
    }
    for (const bat of quoteData.batteries) {
      if (!bat.type || bat.cycles === null || bat.cycles < 0) {
        alert("Please fill all battery details correctly.");
        return false;
      }
    }
    return true;
  }

  function populateModels() {
    const select = form.querySelector("#dji-model");
    select.innerHTML = '<option value="">-- Select a model --</option>';
    djiModels.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      select.appendChild(opt);
    });
  }

  function populatePackages(modelId) {
    const select = form.querySelector("#package-select");
    select.innerHTML = '<option value="">-- Select package --</option>';
    const pkgs = packageOptions[modelId] || {};
    Object.entries(pkgs).forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  // Add battery entry UI
  function addBatteryEntry(battery = {type: '', cycles: ''}) {
    const container = document.getElementById('batteries-container');
    batteryCount++;
    const div = document.createElement('div');
    div.className = 'battery-entry';
    div.innerHTML = `
      <label>Battery Type:
        <input type="text" name="batteryType${batteryCount}" value="${battery.type}" required />
      </label><br/>
      <label>Battery Cycle Count:
        <input type="number" min="0" name="batteryCycles${batteryCount}" value="${battery.cycles}" required />
      </label><br/>
      <button type="button" class="btn btn-remove-battery">Remove</button>
      <hr/>
    `;
    container.appendChild(div);

    // Remove button
    div.querySelector('.btn-remove-battery').addEventListener('click', () => {
      container.removeChild(div);
      // Remove from quoteData as well if needed
    });
  }

  form.addEventListener('click', e => {
    if (e.target.classList.contains('btn-next')) {
      e.preventDefault();
      switch (currentStep) {
        case 0:
          if (!validateStep1()) return;
          quoteData.manufacturer = form.elements['manufacturer'].value;
          populateModels();
          showStep(1);
          break;
        case 1:
          if (!validateStep2()) return;
          quoteData.djiModel = form.elements['djiModel'].value;
          populatePackages(quoteData.djiModel);
          showStep(2);
          break;
        case 2:
          if (!validateStep3()) return;
          quoteData.package = form.elements['package'].value;
          showStep(3);
          break;
        case 3:
          if (!validateStep4()) return;
          quoteData.condition = form.querySelector('input[name="condition"]:checked').value;
          showStep(4);
          break;
        case 4:
          if (!validateStep5()) return;
          const fhInput = form.elements['flightHours'].value;
          const fhRangeInput = form.querySelector('input[name="flightHoursRange"]:checked');
          quoteData.flightHours = fhInput ? parseFloat(fhInput) : null;
          quoteData.flightHoursRange = fhRangeInput ? fhRangeInput.value : null;
          showStep(5);
          break;
        case 5:
          // Collect battery info dynamically before validation
          const batteries = [];
          const container = document.getElementById('batteries-container');
          const entries = container.querySelectorAll('.battery-entry');
          entries.forEach(div => {
            const type = div.querySelector('input[type="text"]').value.trim();
            let cyclesRaw = div.querySelector('input[type="number"]').value;
            const cycles = cyclesRaw === '' ? null : Number(cyclesRaw);
            batteries.push({type, cycles});
          });
          quoteData.batteries = batteries;
          if (!validateStep6()) return;
          // For demonstration, we’ll stop here.
          alert('Steps 1-6 complete! You can continue building further steps.');
          break;
        default:
          if (currentStep < steps.length - 1) {
            showStep(currentStep + 1);
          }
          return;
      }
    } else if (e.target.classList.contains('btn-back')) {
      e.preventDefault();
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    } else if (e.target.id === 'add-battery-btn') {
      e.preventDefault();
      addBatteryEntry();
    }
  });

  // Initialize wizard: show Step 1 and add initial battery entry
  showStep(0);
  addBatteryEntry();

});
