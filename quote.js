// quote.js

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;

  // Data storage
  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null,
    condition: null,
    flightHours: null,
    flightHoursRange: null,
    batteries: [],
    unbound: null,
    damage: null,
    damageDescription: "",
    packageContents: {},
    droneSerial: null,
    controllerSerial: null,
    photos: [],
    legalRight: null,
  };

  // DJI Models categorised per spec
  const djiModels = {
    mini: [
      {id: "mini", name: "DJI Mini"},
      {id: "mini-se", name: "DJI Mini SE"},
      {id: "mini-2", name: "DJI Mini 2"},
      {id: "mini-2-se", name: "DJI Mini 2 SE"},
      {id: "mini-3", name: "DJI Mini 3"},
      {id: "mini-3-pro", name: "DJI Mini 3 Pro"},
      {id: "mini-4-pro", name: "DJI Mini 4 Pro"},
      {id: "mini-5-pro", name: "DJI Mini 5 Pro"},
    ],
    neo: [
      {id: "neo", name: "DJI Neo"},
      {id: "neo-2", name: "DJI Neo 2"},
    ],
    lito: [
      {id: "lito-1", name: "DJI Lito 1"},
      {id: "lito-x1", name: "DJI Lito X1"},
    ],
    flip: [
      {id: "flip", name: "DJI Flip"},
    ],
    air: [
      {id: "air", name: "DJI Air"},
      {id: "air-2", name: "DJI Air 2"},
      {id: "air-2s", name: "DJI Air 2S"},
      {id: "air-3", name: "DJI Air 3"},
      {id: "air-3s", name: "DJI Air 3S"},
    ],
    mavic: [
      {id: "mavic-mini", name: "DJI Mavic Mini"},
      {id: "mavic-pro", name: "DJI Mavic Pro"},
      {id: "mavic-2-pro", name: "DJI Mavic 2 Pro"},
      {id: "mavic-2-zoom", name: "DJI Mavic 2 Zoom"},
      {id: "mavic-3", name: "DJI Mavic 3"},
      {id: "mavic-3-classic", name: "DJI Mavic 3 Classic"},
      {id: "mavic-3-pro", name: "DJI Mavic 3 Pro"},
      {id: "mavic-3-pro-cine", name: "DJI Mavic 3 Pro Cine"},
      {id: "mavic-4-pro", name: "DJI Mavic 4 Pro"},
    ],
    fpv: [
      {id: "fpv", name: "DJI FPV"},
      {id: "avata", name: "DJI Avata"},
      {id: "avata-2", name: "DJI Avata 2"},
      {id: "avata-360", name: "DJI Avata 360"},
    ],
    commercial: [
      {id: "mavic-3-enterprise", name: "DJI Mavic 3 Enterprise"},
      {id: "mavic-3-thermal", name: "DJI Mavic 3 Thermal"},
      {id: "mavic-3-multispectral", name: "DJI Mavic 3 Multispectral"},
      {id: "matrice-4e", name: "DJI Matrice 4E"},
      {id: "matrice-4t", name: "DJI Matrice 4T"},
      {id: "matrice-30", name: "DJI Matrice 30"},
      {id: "matrice-30t", name: "DJI Matrice 30T"},
      {id: "matrice-300-rtk", name: "DJI Matrice 300 RTK"},
      {id: "matrice-350-rtk", name: "DJI Matrice 350 RTK"},
      {id: "matrice-400", name: "DJI Matrice 400"},
      {id: "inspire-1", name: "DJI Inspire 1"},
      {id: "inspire-2", name: "DJI Inspire 2"},
      {id: "inspire-3", name: "DJI Inspire 3"},
      {id: "agras", name: "DJI Agras"},
    ],
  };

  // Package options data - partial example for expandability
  const packageOptions = {
    "mini-5-pro": {
      "drone-only": "Drone only",
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2",
      "fly-more-plus-rc-2": "Fly More Combo Plus + RC 2",
    },
    "mini-4-pro": {
      "drone-only": "Drone only",
      "standard-rc-n2": "Standard + RC-N2",
      "standard-rc-2": "Standard + RC 2",
      "fly-more-rc-n2": "Fly More Combo + RC-N2",
      "fly-more-rc-2": "Fly More Combo + RC 2",
    },
    "mini-3-pro": {
      "drone-only": "Drone only",
      "drone-rc-n1": "Drone + RC-N1",
      "drone-dji-rc": "Drone + DJI RC",
      "fly-more-rc-n1": "Fly More Combo + RC-N1",
      "fly-more-dji-rc": "Fly More Combo + DJI RC",
    },
    "mini-3": {
      "drone-only": "Drone only",
      "standard-rc-n1": "Standard + RC-N1",
      "fly-more-rc-n1": "Fly More Combo + RC-N1",
    },
    "mini-2": {
      "drone-only": "Drone only",
      "standard-rc-n1": "Standard + RC-N1",
      "fly-more": "Fly More Combo",
    },
    neo: {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo",
      // Other packages can be added
    },
    neo-2: {
      // Official package variants here
      "standard": "Standard Package",
      "fly-more": "Fly More Combo",
    },
    // similarly add for other models
    flip: {
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2",
    },
    // etc...
  };

  // Pricing engine skeleton, prices TBC
  const pricing = {
    "mini-5-pro": {
      "fly-more-rc-2": {
        basePrice: 0,
        floorPrice: 0,
        flightDeductions: {
          "0-5": 0,
          "5-20": 0,
          "20-50": 0,
          "50-100": 0,
          "100-150": 0,
          "150-200": 0,
          "200+": null
        },
        batteryRules: {},
        conditionRules: {},
        missingItems: {},
        extras: {}
      }
      // Add other packages/pricing here
    }
  };

  /**
   * Utilities
   */
  
  // Show current wizard step and update progress
  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      if (progressList[i]) {
        progressList[i].setAttribute('aria-current', i === index ? 'step' : 'false');
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Validate current step fields
  function validateStep(step) {
    let valid = true;
    let elements;
    if (step.dataset.step === "1") {
      elements = step.querySelectorAll('input[name="manufacturer"]');
      if (![...elements].some(el => el.checked)) {
        valid = false;
        alert("Please select a manufacturer.");
      }
    } else if (step.dataset.step === "2") {
      const select = step.querySelector('#dji-model');
      if (!select.value) {
        valid = false;
        alert("Please select a DJI model.");
      }
    } else if (step.dataset.step === "3") {
      const select = step.querySelector('#package-select');
      if (!select.value) {
        valid = false;
        alert("Please select a package.");
      }
    } else if (step.dataset.step === "4") {
      elements = step.querySelectorAll('input[name="condition"]');
      if (![...elements].some(el => el.checked)) {
        valid = false;
        alert("Please select the condition of your drone.");
      }
    } else if (step.dataset.step === "5") {
      const flightNumber = step.querySelector('input[name="flightHours"]');
      const flightRangeRadios = step.querySelectorAll('input[name="flightHoursRange"]');
      if (!flightNumber.value && ![...flightRangeRadios].some(r => r.checked)) {
        valid = false;
        alert("Please enter flight hours or select a flight hours range.");
      }
    } else if (step.dataset.step === "6") {
      // Batteries inputs must have valid types and cycles
      const batteryContainers = step.querySelectorAll('.battery-entry');
      for(const batteryEntry of batteryContainers) {
        const type = batteryEntry.querySelector('input[name^="batteryType"]').value.trim();
        const cycles = batteryEntry.querySelector('input[name^="batteryCycles"]').value.trim();
        if (!type) {
          valid = false;
          alert("Please enter battery type(s).");
          break;
        }
        if (cycles === "" || isNaN(cycles) || Number(cycles) < 0) {
          valid = false;
          alert("Please enter valid battery cycle counts (0 or more).");
          break;
        }
      }
    } else if (step.dataset.step === "7") {
      elements = step.querySelectorAll('input[name="unbound"]');
      if (![...elements].some(el => el.checked)) {
        valid = false;
        alert("Please select if your drone is unbound from your DJI account.");
      }
    } else if (step.dataset.step === "8") {
      elements = step.querySelectorAll('input[name="damage"]');
      if (![...elements].some(el => el.checked)) {
        valid = false;
        alert("Please indicate if your drone has any damage.");
      }
      else {
        const damageYes = step.querySelector('input[name="damage"][value="yes"]');
        if(damageYes.checked) {
          const desc = step.querySelector("#damage-description").value.trim();
          if (desc.length === 0) {
            valid = confirm("You indicated damage but have not described it. Continue?");
          }
        }
      }
    } else if (step.dataset.step === "9") {
      // Package contents at least must be present/missing/ additional for all items
      const selects = step.querySelectorAll('select[name^="packageContents"]');
      if ([...selects].some(s => !s.value)) {
        valid = false;
        alert("Please mark status for all package contents items.");
      }
    } else if (step.dataset.step === "10") {
      const droneSerial = step.querySelector('#drone-serial-number').value.trim();
      if (!droneSerial) {
        valid = false;
        alert("Please enter drone serial number.");
      }
      // controller serial optional
    } else if (step.dataset.step === "11") {
      const files = step.querySelector('#photo-uploads').files;
      if (!files.length) {
        valid = false;
        alert("Please upload required photos.");
      }
    } else if (step.dataset.step === "13") {
      const fullName = step.querySelector('input[name="fullName"]').value.trim();
      const email = step.querySelector('input[name="email"]').value.trim();
      const phone = step.querySelector('input[name="phone"]').value.trim();
      const addressLine1 = step.querySelector('input[name="addressLine1"]').value.trim();
      const city = step.querySelector('input[name="city"]').value.trim();
      const county = step.querySelector('input[name="county"]').value.trim();
      const postcode = step.querySelector('input[name="postcode"]').value.trim();
      const legalRightRadios = step.querySelectorAll('input[name="legalRight"]');
      if(!fullName || !email || !phone || !addressLine1 || !city || !county || !postcode) {
        valid = false;
        alert("Please fill in all required fields.");
      } else {
        // Basic email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          valid = false;
          alert("Please enter a valid email address.");
        }
        // Basic UK phone (simple)
        const phoneRegex = /^[+0-9\s\-()]{6,20}$/;
        if (!phoneRegex.test(phone)) {
          valid = false;
          alert("Please enter a valid telephone number.");
        }
        // UK postcode format simple validation (already via pattern on input)
        const postcodeRegex = /^([A-Z]{1,2}[0-9][0-9A-Z]? ?[0-9][A-Z]{2})$/i;
        if (!postcodeRegex.test(postcode)) {
          valid = false;
          alert("Please enter a valid UK postcode.");
        }
        if (![...legalRightRadios].some(r=>r.checked)) {
          valid = false;
          alert("Please indicate if you have the legal right to sell this equipment.");
        } else {
          const value = [...legalRightRadios].find(r=>r.checked).value;
          if (value === "no" || value === "not-sure") {
            alert("Automatic purchase quote unavailable where ownership is uncertain. Please contact us for manual review.");
            // Allow form submit to still continue (depending on business rules)
          }
        }
      }
    }
    return valid;
  }

  function goToNextStep() {
    if (!validateStep(steps[currentStep])) return;
    if(currentStep < steps.length-1){
      showStep(currentStep + 1);
    }
  }
  function goToPrevStep(){
    if(currentStep > 0){
      showStep(currentStep -1);
    }
  }

  // Event delegation for buttons in wizard steps
  form.addEventListener("click", e => {
    if(e.target.classList.contains("btn-next")){
      e.preventDefault();
      goToNextStep();
    } else if(e.target.classList.contains("btn-back")) {
      e.preventDefault();
      goToPrevStep();
    } else if(e.target.classList.contains("btn-accept")) {
      e.preventDefault();
      goToNextStep();
    } else if(e.target.classList.contains("btn-add") && e.target.id === "add-battery-btn") {
      e.preventDefault();
      addBatteryEntry();
    }
  });

  // Populate DJI model dropdown on step 2
  function populateDjiModels() {
    const select = document.getElementById("dji-model");
    select.innerHTML = "";
    Object.values(djiModels).flat().forEach(model => {
      let opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      select.appendChild(opt);
    });
  }

  // Populate package select on step 3
  function populatePackages(modelId) {
    const select = document.getElementById("package-select");
    select.innerHTML = "";
    let pkgs = packageOptions[modelId] || {};
    if (Object.keys(pkgs).length === 0) {
      // Add a default package option
      let opt = document.createElement("option");
      opt.value = "standard";
      opt.textContent = "Standard Package";
      select.appendChild(opt);
    } else {
      Object.entries(pkgs).forEach(([key, label]) => {
        let opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        select.appendChild(opt);
      });
    }
  }

  // Add battery entry UI
  function addBatteryEntry(battery = {}) {
    const container = document.getElementById("batteries-container");
    const count = container.querySelectorAll(".battery-entry").length + 1;
    const div = document.createElement("div");
    div.className = "battery-entry";
    div.style.border = "1px solid #ccc";
    div.style.padding = "1rem";
    div.style.marginBottom = "1rem";
    div.innerHTML = `
      <label for="battery-type-${count}">Battery Type</label>
      <input type="text" id="battery-type-${count}" name="batteryType${count}" required value="${battery.type || ''}" />
      <label for="battery-cycles-${count}">Battery Cycle Count</label>
      <input type="number" id="battery-cycles-${count}" name="batteryCycles${count}" min="0" step="1" required value="${battery.cycles || ''}" />
      <button type="button" class="btn btn-back btn-remove-battery" aria-label="Remove Battery">Remove Battery</button>
    `;
    container.appendChild(div);
    // Remove battery logic
    div.querySelector(".btn-remove-battery").addEventListener("click", () => div.remove());
  }

  // Update damage details visibility
  const damageInputs = document.querySelectorAll('input[name="damage"]');
  const damageDetails = document.getElementById("damage-details");
  damageInputs.forEach(input => {
    input.addEventListener("change", () => {
      if(input.value === "yes" && input.checked) {
        damageDetails.hidden = false;
        damageDetails.querySelector("textarea").setAttribute("required", "true");
      } else if(input.value === "no" && input.checked) {
        damageDetails.hidden = true;
        damageDetails.querySelector("textarea").removeAttribute("required");
      }
    });
  });

  // Package Contents per package (simplified example)
  // After package is selected, we show expected contents to mark present/missing/additional
  function populatePackageContents(packageId) {
    const container = document.getElementById("package-contents-list");
    container.innerHTML = ""; 
    // Example contents list (simplified - real system should be dynamic)
    const exampleContents = [
      "Drone",
      "Controller",
      "Battery 1",
      "Battery 2",
      "Battery 3",
      "Charging hub",
      "Bag",
      "Propellers",
      "Power supply",
      "Cables",
      "Other accessories"
    ];

    exampleContents.forEach((item, i) => {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "0.5rem";
      wrapper.innerHTML = `
        <label for="packageContents-${i}">${item}</label>
        <select id="packageContents-${i}" name="packageContents-${i}" required aria-required="true" style="margin-left:1rem;">
          <option value="">-- Select Status --</option>
          <option value="present">Present</option>
          <option value="missing">Missing</option>
          <option value="additional">Additional</option>
        </select>
      `;
      container.appendChild(wrapper);
    });
  }

  // Collect form data into quoteData
  function collectData() {
    const f = new FormData(form);
    // Manufacturer
    quoteData.manufacturer = f.get("manufacturer");
    // DJI Model
    quoteData.djiModel = f.get("djiModel");
    // Package
    quoteData.package = f.get("package");
    // Condition
    quoteData.condition = f.get("condition");
    // Flight hours either number or range
    const fhNumber = f.get("flightHours");
    const fhRange = f.get("flightHoursRange");
    if(fhNumber) quoteData.flightHours = Number(fhNumber);
    else quoteData.flightHours = null;
    quoteData.flightHoursRange = fhRange || null;
    // Batteries
    quoteData.batteries = [];
    const batteryTypes = [];
    const batteryCycles = [];
    // workaround: gather batteries dynamically because they have numeric suffix names
    Array.from(form.elements).forEach(el => {
      if(/^batteryType\d+$/.test(el.name)) batteryTypes.push(el.value.trim());
      if(/^batteryCycles\d+$/.test(el.name)) batteryCycles.push(el.value.trim());
    });
    for(let i=0; i<batteryTypes.length; i++){
      if(batteryTypes[i] && batteryCycles[i]) {
        quoteData.batteries.push({type: batteryTypes[i], cycles: Number(batteryCycles[i])});
      }
    }
    // Unbound
    quoteData.unbound = f.get("unbound");
    // Damage
    quoteData.damage = f.get("damage");
    quoteData.damageDescription = f.get("damageDescription") || "";
    // Package contents
    quoteData.packageContents = {};
    Object.entries(f.entries()).forEach(([key, value]) => {
      if(key.startsWith("packageContents-")) {
        quoteData.packageContents[key] = value;
      }
    });
    // Serial numbers
    quoteData.droneSerial = f.get("droneSerial");
    quoteData.controllerSerial = f.get("controllerSerial");
    // Photos - we cannot persist these in memory, but we check uploads on step 11
    // Legal right to sell
    quoteData.legalRight = f.get("legalRight");
  }

  // Render quote summary on step 12
  function renderQuoteSummary() {
    const div = document.getElementById("quote-summary");
    const formatCurrency = (val) => val === null ? 'TBC' : `£${val.toFixed(2)}`;

    // For now, mock pricing calculation returns TBC or 0
    let price = calculateInstantQuote() || 0;

    let content = `
      <p><strong>${getModelName(quoteData.djiModel) || "Selected Model"}</strong></p>
      <p>Package: ${getPackageLabel(quoteData.djiModel, quoteData.package)}</p>
      <p>Condition: ${formatCondition(quoteData.condition)}</p>
      <p>Flight time: ${quoteData.flightHours !== null ? quoteData.flightHours + " hours" : "N/A"}</p>
      <p>Batteries: ${quoteData.batteries.length}</p>
      <h3>Estimated purchase price:</h3>
      <p class="quote-price" style="font-size: 1.8rem; color:#0070c0;">${formatCurrency(price)}</p>
    `;

    div.innerHTML = content;
  }

  // Calculate instant quote (mockup)
  function calculateInstantQuote() {
    // Guidelines: Base price - deductions, logic TBD
    // For now, return TBC or 0 if missing

    const model = quoteData.djiModel;
    const pkg = quoteData.package;

    if (!model || !pkg) return null;

    // Access pricing data
    let modelPricing = pricing[model];
    if(!modelPricing) return null;

    let pkgPricing = modelPricing[pkg];
    if(!pkgPricing) return null;

    let price = pkgPricing.basePrice || 0;
    // Subtract flight deductions if flightHoursRange matches
    let flightDeduction = 0;
    if (quoteData.flightHoursRange && pkgPricing.flightDeductions) {
      flightDeduction = pkgPricing.flightDeductions[quoteData.flightHoursRange] || 0;
    } else if (quoteData.flightHours !== null && pkgPricing.flightDeductions) {
      // assign range by flightHours
      const fh = quoteData.flightHours;
      let range = null;
      if(fh <= 5) range = "0-5";
      else if (fh <= 20) range = "5-20";
      else if (fh <= 50) range = "20-50";
      else if(fh <= 100) range = "50-100";
      else if(fh <= 150) range = "100-150";
      else if(fh <= 200) range = "150-200";
      else range = "200+";
      flightDeduction = pkgPricing.flightDeductions[range] || 0;
    }
    if(flightDeduction) price -= flightDeduction;

    // TODO: battery deductions, condition adjustments, missing items, extras

    if(price < (pkgPricing.floorPrice || 0)) {
      return null; // manual valuation required
    }
    return price;
  }

  // Helpers for labels
  function getModelName(modelId) {
    for(const cat of Object.values(djiModels)){
      const m = cat.find(m => m.id === modelId);
      if(m) return m.name;
    }
    return modelId;
  }

  function getPackageLabel(modelId, packageId) {
    let pkgs = packageOptions[modelId] || {};
    return pkgs[packageId] || packageId || "Standard Package";
  }

  function formatCondition(value) {
    switch(value) {
      case "factory-sealed": return "Factory Sealed / Unopened";
      case "opened-unused": return "Opened but Unused";
      case "excellent": return "Excellent";
      case "good": return "Good";
      case "fair": return "Fair";
      case "damaged": return "Damaged";
      case "not-working": return "Not Working / Spares Only";
      default: return value;
    }
  }

  // Listen dji model change and update packages
  const selectDjiModel = document.getElementById("dji-model");
  selectDjiModel.addEventListener("change", (e) => {
    populatePackages(e.target.value);
  });

  // On changing package select populate package contents
  const packageSelect = document.getElementById("package-select");
  packageSelect.addEventListener("change", (e) => {
    populatePackageContents(e.target.value);
  });

  // Form submit handler
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validateStep(steps[currentStep])) return;

    collectData();

    // Generate unique quote reference
    const reference = generateQuoteReference();

    // Show step 14 quote submitted step with reference
    showStep(14);
    document.getElementById("quote-reference").textContent = reference;

    // Simulate backend integration warning
    alert("Backend integration required for real submission, payment, and shipping.");
  });

  function generateQuoteReference() {
    const year = new Date().getFullYear();
    const randNum = Math.floor(Math.random() * 900000) + 100000;
    return `WBA-${year}-${randNum}`;
  }

  // Initialize wizard
  function init() {
    populateDjiModels();
    showStep(0);
    addBatteryEntry(); // provide initially one battery entry
  }

  init();

  // Show or hide damage details based on damage answer handled above.

  // When reaching quote result step
  form.addEventListener("click", e => {
    if(e.target.classList.contains("btn-next")){
      if(currentStep === 11) { // Photos => Quote result
        collectData();
        renderQuoteSummary();
      }
    }
  });

});
