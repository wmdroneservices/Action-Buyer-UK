document.addEventListener("DOMContentLoaded", function () {

  "use strict";

  /* =========================================================
     BASIC DOM SETUP
  ========================================================= */

  const form = document.getElementById("quote-form");

  if (!form) {
    console.error("quote.js: quote-form was not found.");
    return;
  }

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressItems = Array.from(
    document.querySelectorAll("#progress-indicator .progress-step")
  );

  let currentStep = 0;
  let quoteAccepted = false;
  let manualValuation = false;

  if (!steps.length) {
    console.error("quote.js: No wizard steps were found.");
    return;
  }


  /* =========================================================
     MODEL DATABASE
  ========================================================= */

  const modelDatabase = {

    mini: [
      { id: "mini", name: "DJI Mini" },
      { id: "mini-se", name: "DJI Mini SE" },
      { id: "mini-2", name: "DJI Mini 2" },
      { id: "mini-2-se", name: "DJI Mini 2 SE" },
      { id: "mini-3", name: "DJI Mini 3" },
      { id: "mini-3-pro", name: "DJI Mini 3 Pro" },
      { id: "mini-4-pro", name: "DJI Mini 4 Pro" },
      { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
    ],

    neo: [
      { id: "neo", name: "DJI Neo" },
      { id: "neo-2", name: "DJI Neo 2" }
    ],

    lito: [
      { id: "lito-1", name: "DJI Lito 1" },
      { id: "lito-x1", name: "DJI Lito X1" }
    ],

    flip: [
      { id: "flip", name: "DJI Flip" }
    ],

    air: [
      { id: "air", name: "DJI Air" },
      { id: "air-2", name: "DJI Air 2" },
      { id: "air-2s", name: "DJI Air 2S" },
      { id: "air-3", name: "DJI Air 3" },
      { id: "air-3s", name: "DJI Air 3S" }
    ],

    mavic: [
      { id: "mavic-mini", name: "DJI Mavic Mini" },
      { id: "mavic-pro", name: "DJI Mavic Pro" },
      { id: "mavic-2-pro", name: "DJI Mavic 2 Pro" },
      { id: "mavic-2-zoom", name: "DJI Mavic 2 Zoom" },
      { id: "mavic-3", name: "DJI Mavic 3" },
      { id: "mavic-3-classic", name: "DJI Mavic 3 Classic" },
      { id: "mavic-3-pro", name: "DJI Mavic 3 Pro" },
      { id: "mavic-3-pro-cine", name: "DJI Mavic 3 Pro Cine" },
      { id: "mavic-4-pro", name: "DJI Mavic 4 Pro" }
    ],

    fpv: [
      { id: "fpv", name: "DJI FPV" },
      { id: "avata", name: "DJI Avata" },
      { id: "avata-2", name: "DJI Avata 2" },
      { id: "avata-360", name: "DJI Avata 360" }
    ],

    commercial: [
      { id: "mavic-3-enterprise", name: "DJI Mavic 3 Enterprise" },
      { id: "mavic-3-thermal", name: "DJI Mavic 3 Thermal" },
      { id: "mavic-3-multispectral", name: "DJI Mavic 3 Multispectral" },
      { id: "matrice-4e", name: "DJI Matrice 4E" },
      { id: "matrice-4t", name: "DJI Matrice 4T" },
      { id: "matrice-30", name: "DJI Matrice 30" },
      { id: "matrice-30t", name: "DJI Matrice 30T" },
      { id: "matrice-300-rtk", name: "DJI Matrice 300 RTK" },
      { id: "matrice-350-rtk", name: "DJI Matrice 350 RTK" },
      { id: "matrice-400", name: "DJI Matrice 400" },
      { id: "inspire-1", name: "DJI Inspire 1" },
      { id: "inspire-2", name: "DJI Inspire 2" },
      { id: "inspire-3", name: "DJI Inspire 3" },
      { id: "agras", name: "DJI Agras" }
    ]

  };


  /* =========================================================
     PACKAGE DATABASE
  ========================================================= */

  const packageDatabase = {

    "mini-5-pro": [
      ["drone-only", "Drone only"],
      ["standard-rc-n3", "Standard + RC-N3"],
      ["fly-more-rc-n3", "Fly More Combo + RC-N3"],
      ["fly-more-rc-2", "Fly More Combo + RC 2"],
      ["fly-more-plus-rc-2", "Fly More Combo Plus + RC 2"]
    ],

    "mini-4-pro": [
      ["drone-only", "Drone only"],
      ["standard-rc-n2", "Standard + RC-N2"],
      ["standard-rc-2", "Standard + RC 2"],
      ["fly-more-rc-n2", "Fly More Combo + RC-N2"],
      ["fly-more-rc-2", "Fly More Combo + RC 2"]
    ],

    "mini-3-pro": [
      ["drone-only", "Drone only"],
      ["drone-rc-n1", "Drone + RC-N1"],
      ["drone-dji-rc", "Drone + DJI RC"],
      ["fly-more-rc-n1", "Fly More Combo + RC-N1"],
      ["fly-more-dji-rc", "Fly More Combo + DJI RC"]
    ],

    "mini-3": [
      ["drone-only", "Drone only"],
      ["standard-rc-n1", "Standard + RC-N1"],
      ["fly-more-rc-n1", "Fly More Combo + RC-N1"]
    ],

    "mini-2": [
      ["drone-only", "Drone only"],
      ["standard-rc-n1", "Standard + RC-N1"],
      ["fly-more", "Fly More Combo"]
    ],

    "neo": [
      ["drone-only", "Drone only"],
      ["fly-more", "Fly More Combo"]
    ],

    "neo-2": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "flip": [
      ["standard-rc-n3", "Standard + RC-N3"],
      ["fly-more-rc-n3", "Fly More Combo + RC-N3"],
      ["fly-more-rc-2", "Fly More Combo + RC 2"]
    ],

    "air": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "air-2": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "air-2s": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "air-3": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "air-3s": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "mavic-3": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "mavic-3-classic": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "mavic-3-pro": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "mavic-4-pro": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ],

    "avata": [
      ["drone-only", "Drone only"],
      ["fly-smart", "Fly Smart Combo"],
      ["pro-view", "Pro-View Combo"],
      ["explorer", "Explorer Combo"]
    ],

    "avata-2": [
      ["standard", "Standard Package"],
      ["fly-more", "Fly More Combo"]
    ]

  };


  /* =========================================================
     PRICING DATABASE
     
     £500 = Mini 5 Pro Fly More Combo + RC 2
  ========================================================= */

  const pricingDatabase = {

    "mini-5-pro": {

      "fly-more-rc-2": {

        basePrice: 500,

        floorPrice: 250,

        flightDeductions: {
          "0-5": 0,
          "5-20": 25,
          "20-50": 50,
          "50-100": 100,
          "100-150": 150,
          "150-200": 200,
          "200+": null
        },

        conditionRules: {
          "factory-sealed": 0,
          "opened-unused": 0,
          "excellent": 0,
          "good": 25,
          "fair": 75,
          "damaged": null,
          "not-working": null
        },

        batteryRules: {},

        missingItems: {},

        extras: {}

      }

    }

  };


  /* =========================================================
     CUSTOMER DATA
  ========================================================= */

  const quoteData = {
    manufacturer: "",
    model: "",
    package: "",
    condition: "",
    flightHours: "",
    flightRange: "",
    batteries: [],
    unbound: "",
    damage: "",
    damageDescription: "",
    packageContents: {},
    droneSerial: "",
    controllerSerial: "",
    photos: [],
    legalRight: "",
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: ""
  };


  /* =========================================================
     FIND ELEMENTS
  ========================================================= */

  const modelSelect = document.getElementById("dji-model");
  const packageSelect = document.getElementById("package-select");
  const batteriesContainer = document.getElementById("batteries-container");
  const addBatteryButton = document.getElementById("add-battery-btn");


  /* =========================================================
     SHOW STEP
  ========================================================= */

  function showStep(index) {

    if (index < 0 || index >= steps.length) {
      return;
    }

    steps.forEach(function (step, i) {

      step.hidden = i !== index;

      if (progressItems[i]) {

        if (i === index) {
          progressItems[i].setAttribute("aria-current", "step");
        } else {
          progressItems[i].removeAttribute("aria-current");
        }

      }

    });

    currentStep = index;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  /* =========================================================
     POPULATE MODELS
  ========================================================= */

  function populateModels() {

    if (!modelSelect) {
      console.error("quote.js: dji-model element not found.");
      return;
    }

    modelSelect.innerHTML = "";

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "-- Select a DJI model --";

    modelSelect.appendChild(firstOption);

    Object.keys(modelDatabase).forEach(function (category) {

      const group = document.createElement("optgroup");

      group.label = category.toUpperCase();

      modelDatabase[category].forEach(function (model) {

        const option = document.createElement("option");

        option.value = model.id;
        option.textContent = model.name;

        group.appendChild(option);

      });

      modelSelect.appendChild(group);

    });

  }


  /* =========================================================
     POPULATE PACKAGES
  ========================================================= */

  function populatePackages(modelId) {

    if (!packageSelect) {
      return;
    }

    packageSelect.innerHTML = "";

    const firstOption = document.createElement("option");

    firstOption.value = "";
    firstOption.textContent = "-- Select package --";

    packageSelect.appendChild(firstOption);

    const packages = packageDatabase[modelId];

    if (!packages || !packages.length) {

      const option = document.createElement("option");

      option.value = "manual";
      option.textContent = "Package not listed - Manual Valuation";

      packageSelect.appendChild(option);

      return;

    }

    packages.forEach(function (item) {

      const option = document.createElement("option");

      option.value = item[0];
      option.textContent = item[1];

      packageSelect.appendChild(option);

    });

  }


  /* =========================================================
     BATTERY ENTRY
  ========================================================= */

  let batteryCounter = 0;

  function createBatteryEntry() {

    if (!batteriesContainer) {
      console.error("quote.js: batteries-container not found.");
      return;
    }

    batteryCounter++;

    const wrapper = document.createElement("div");

    wrapper.className = "battery-entry";

    wrapper.style.border = "1px solid #ccc";
    wrapper.style.padding = "15px";
    wrapper.style.marginBottom = "15px";
    wrapper.style.borderRadius = "6px";

    wrapper.innerHTML = `
      <h4>Battery ${batteryCounter}</h4>

      <label>
        Battery Type
        <input
          type="text"
          class="battery-type"
          name="batteryType${batteryCounter}"
          required
        >
      </label>

      <label>
        Battery Cycle Count
        <input
          type="number"
          class="battery-cycles"
          name="batteryCycles${batteryCounter}"
          min="0"
          step="1"
          required
        >
      </label>

      <button
        type="button"
        class="btn-remove-battery"
      >
        Remove Battery
      </button>
    `;

    batteriesContainer.appendChild(wrapper);

  }


  /* =========================================================
     BATTERY BUTTON
  ========================================================= */

  if (addBatteryButton) {

    addBatteryButton.addEventListener("click", function (event) {

      event.preventDefault();

      createBatteryEntry();

    });

  }


  /* =========================================================
     BATTERY VALIDATION
  ========================================================= */

  function validateBatteries() {

    if (!batteriesContainer) {
      return false;
    }

    const batteries = Array.from(
      batteriesContainer.querySelectorAll(".battery-entry")
    );

    if (!batteries.length) {

      alert("Please add at least one battery.");

      return false;

    }

    for (const battery of batteries) {

      const typeInput = battery.querySelector(".battery-type");
      const cyclesInput = battery.querySelector(".battery-cycles");

      if (!typeInput || !typeInput.value.trim()) {

        alert("Please enter the battery type.");

        return false;

      }

      if (
        !cyclesInput ||
        cyclesInput.value === "" ||
        Number(cyclesInput.value) < 0
      ) {

        alert("Please enter a valid battery cycle count.");

        return false;

      }

    }

    return true;

  }


  /* =========================================================
     VALIDATE CURRENT STEP
  ========================================================= */

  function validateCurrentStep() {

    const step = steps[currentStep];

    if (!step) {
      return false;
    }


    /* STEP 1 */

    if (currentStep === 0) {

      const manufacturer =
        step.querySelector('input[name="manufacturer"]:checked');

      if (!manufacturer) {

        alert("Please select a manufacturer.");

        return false;

      }

      quoteData.manufacturer = manufacturer.value;

      return true;

    }


    /* STEP 2 */

    if (currentStep === 1) {

      if (!modelSelect || !modelSelect.value) {

        alert("Please select a DJI model.");

        return false;

      }

      quoteData.model = modelSelect.value;

      return true;

    }


    /* STEP 3 */

    if (currentStep === 2) {

      if (!packageSelect || !packageSelect.value) {

        alert("Please select a package.");

        return false;

      }

      quoteData.package = packageSelect.value;

      return true;

    }


    /* STEP 4 */

    if (currentStep === 3) {

      const condition =
        step.querySelector('input[name="condition"]:checked');

      if (!condition) {

        alert("Please select the condition of the drone.");

        return false;

      }

      quoteData.condition = condition.value;

      return true;

    }


    /* STEP 5 */

    if (currentStep === 4) {

      const hours =
        step.querySelector('input[name="flightHours"]');

      const range =
        step.querySelector('input[name="flightHoursRange"]:checked');

      if (
        (!hours || hours.value === "") &&
        !range
      ) {

        alert(
          "Please enter the flight hours or select a flight-time range."
        );

        return false;

      }

      if (hours && hours.value !== "") {

        const value = Number(hours.value);

        if (isNaN(value) || value < 0) {

          alert("Please enter a valid number of flight hours.");

          return false;

        }

        quoteData.flightHours = value;

      }

      if (range) {

        quoteData.flightRange = range.value;

      }

      return true;

    }


    /* STEP 6 */

    if (currentStep === 5) {

      if (!validateBatteries()) {

        return false;

      }

      quoteData.batteries = [];

      batteriesContainer
        .querySelectorAll(".battery-entry")
        .forEach(function (battery) {

          quoteData.batteries.push({

            type:
              battery.querySelector(".battery-type").value.trim(),

            cycles:
              Number(
                battery.querySelector(".battery-cycles").value
              )

          });

        });

      return true;

    }


    /* STEP 7 */

    if (currentStep === 6) {

      const unbound =
        step.querySelector('input[name="unbound"]:checked');

      if (!unbound) {

        alert("Please select the unbound status.");

        return false;

      }

      quoteData.unbound = unbound.value;

      return true;

    }


    /* STEP 8 */

    if (currentStep === 7) {

      const damage =
        step.querySelector('input[name="damage"]:checked');

      if (!damage) {

        alert("Please indicate whether the drone has damage.");

        return false;

      }

      quoteData.damage = damage.value;

      const description =
        step.querySelector("#damage-description");

      if (
        damage.value === "yes" &&
        description &&
        !description.value.trim()
      ) {

        alert("Please describe the damage.");

        return false;

      }

      if (description) {

        quoteData.damageDescription =
          description.value.trim();

      }

      return true;

    }


    /* STEP 9 */

    if (currentStep === 8) {

      const contents =
        step.querySelectorAll(
          'select[name^="packageContents"]'
        );

      for (const select of contents) {

        if (!select.value) {

          alert(
            "Please select PRESENT, MISSING or ADDITIONAL for every item."
          );

          return false;

        }

        quoteData.packageContents[select.name] =
          select.value;

      }

      return true;

    }


    /* STEP 10 */

    if (currentStep === 9) {

      const serial =
        step.querySelector("#drone-serial-number");

      if (!serial || !serial.value.trim()) {

        alert("Please enter the drone serial number.");

        return false;

      }

      quoteData.droneSerial =
        serial.value.trim();

      const controller =
        step.querySelector("#controller-serial-number");

      if (controller) {

        quoteData.controllerSerial =
          controller.value.trim();

      }

      return true;

    }


    /* STEP 11 */

    if (currentStep === 10) {

      const photos =
        step.querySelector("#photo-uploads");

      if (!photos || !photos.files.length) {

        alert("Please upload the required photographs.");

        return false;

      }

      quoteData.photos =
        Array.from(photos.files);

      return true;

    }


    return true;

  }


  /* =========================================================
     FLIGHT RANGE
  ========================================================= */

  function getFlightRange() {

    if (quoteData.flightRange) {

      return quoteData.flightRange;

    }

    const hours =
      Number(quoteData.flightHours);

    if (isNaN(hours)) {
      return null;
    }

    if (hours <= 5) return "0-5";
    if (hours <= 20) return "5-20";
    if (hours <= 50) return "20-50";
    if (hours <= 100) return "50-100";
    if (hours <= 150) return "100-150";
    if (hours <= 200) return "150-200";

    return "200+";

  }


  /* =========================================================
     CALCULATE QUOTE
  ========================================================= */

  function calculateQuote() {

    const modelPricing =
      pricingDatabase[quoteData.model];

    if (!modelPricing) {

      return {
        automatic: false,
        reason:
          "This model has not yet been given a verified automatic purchase price."
      };

    }

    const packagePricing =
      modelPricing[quoteData.package];

    if (!packagePricing) {

      return {
        automatic: false,
        reason:
          "This package has not yet been given a verified automatic purchase price."
      };

    }

    if (
      packagePricing.basePrice === null ||
      packagePricing.basePrice === undefined
    ) {

      return {
        automatic: false,
        reason:
          "This model and package have not yet been given a verified automatic purchase price."
      };

    }


    /* Commercial/high-value manual route */

    const commercialCategories = [
      "commercial"
    ];

    const isCommercial =
      commercialCategories.some(function (category) {

        return modelDatabase[category].some(function (model) {

          return model.id === quoteData.model;

        });

      });

    if (isCommercial) {

      return {
        automatic: false,
        reason:
          "High-value professional equipment requires individual assessment."
      };

    }


    /* Damaged */

    if (
      quoteData.condition === "damaged" ||
      quoteData.condition === "not-working"
    ) {

      return {
        automatic: false,
        reason:
          "Damaged or non-working equipment requires a manual parts/damage valuation."
      };

    }


    /* Unbound */

    if (
      quoteData.unbound === "no" ||
      quoteData.unbound === "unknown"
    ) {

      return {
        automatic: false,
        reason:
          "The aircraft must normally be unbound before a standard automatic purchase can proceed."
      };

    }


    let price =
      packagePricing.basePrice;


    /* Flight deduction */

    const flightRange =
      getFlightRange();

    const flightDeduction =
      packagePricing.flightDeductions &&
      packagePricing.flightDeductions[flightRange];

    if (flightDeduction === null) {

      return {
        automatic: false,
        reason:
          "The reported flight time requires manual review."
      };

    }

    if (
      typeof flightDeduction === "number"
    ) {

      price -= flightDeduction;

    }


    /* Condition deduction */

    const conditionDeduction =
      packagePricing.conditionRules &&
      packagePricing.conditionRules[
        quoteData.condition
      ];

    if (conditionDeduction === null) {

      return {
        automatic: false,
        reason:
          "The selected condition requires manual valuation."
      };

    }

    if (
      typeof conditionDeduction === "number"
    ) {

      price -= conditionDeduction;

    }


    /* Battery deductions */

    if (
      packagePricing.batteryRules &&
      quoteData.batteries.length
    ) {

      quoteData.batteries.forEach(function (battery) {

        const cycles =
          battery.cycles;

        if (
          packagePricing.batteryRules.highCycle &&
          cycles >=
          packagePricing.batteryRules.highCycle.threshold
        ) {

          price -=
            packagePricing.batteryRules.highCycle.deduction;

        }

      });

    }


    /* Floor */

    if (
      price <
      packagePricing.floorPrice
    ) {

      return {
        automatic: false,
        reason:
          "The calculated value is below the automatic purchase floor and requires manual valuation."
      };

    }


    return {
      automatic: true,
      price: Math.round(price * 100) / 100
    };

  }


  /* =========================================================
     MODEL NAME
  ========================================================= */

  function getModelName(id) {

    for (const category of Object.keys(modelDatabase)) {

      const found =
        modelDatabase[category].find(function (model) {

          return model.id === id;

        });

      if (found) {
        return found.name;
      }

    }

    return id;

  }


  /* =========================================================
     PACKAGE NAME
  ========================================================= */

  function getPackageName(modelId, packageId) {

    const packages =
      packageDatabase[modelId];

    if (!packages) {
      return packageId;
    }

    const found =
      packages.find(function (item) {

        return item[0] === packageId;

      });

    return found
      ? found[1]
      : packageId;

  }


  /* =========================================================
     CONDITION NAME
  ========================================================= */

  function getConditionName(value) {

    const names = {

      "factory-sealed":
        "Factory Sealed / Unopened",

      "opened-unused":
        "Opened but Unused",

      "excellent":
        "Excellent",

      "good":
        "Good",

      "fair":
        "Fair",

      "damaged":
        "Damaged",

      "not-working":
        "Not Working / Spares Only"

    };

    return names[value] || value;

  }


  /* =========================================================
     QUOTE RESULT
  ========================================================= */

  function renderQuoteResult() {

    const result =
      calculateQuote();

    const summary =
      document.getElementById("quote-summary");

    if (!summary) {

      console.error(
        "quote.js: quote-summary element not found."
      );

      return;

    }


    if (!result.automatic) {

      manualValuation = true;

      summary.innerHTML = `

        <div class="manual-valuation">

          <h3>MANUAL VALUATION REQUIRED</h3>

          <p>
            We need to manually assess this equipment
            before confirming a purchase price.
          </p>

          <p>
            <strong>Reason:</strong>
            ${result.reason}
          </p>

          <p>
            Your information can still be submitted
            for review.
          </p>

        </div>

        <h3>IMPORTANT</h3>

        <p>
          Your information and photographs will be
          reviewed before a purchase price is confirmed.
        </p>

      `;

      const acceptButton =
        document.querySelector(".btn-accept");

      if (acceptButton) {

        acceptButton.textContent =
          "Submit For Manual Review";

      }

      return;

    }


    manualValuation = false;

    summary.innerHTML = `

      <div class="quote-result">

        <h3>YOUR INSTANT QUOTE</h3>

        <p>
          <strong>
            ${getModelName(quoteData.model)}
          </strong>
        </p>

        <p>
          Package:
          ${getPackageName(
            quoteData.model,
            quoteData.package
          )}
        </p>

        <p>
          Condition:
          ${getConditionName(
            quoteData.condition
          )}
        </p>

        <p>
          Flight time:
          ${
            quoteData.flightHours !== ""
              ? quoteData.flightHours + " hours"
              : getFlightRange()
          }
        </p>

        <p>
          Batteries:
          ${quoteData.batteries.length}
        </p>

        <h3>
          Estimated purchase price:
        </h3>

        <p
          class="quote-price"
          style="font-size:2rem;font-weight:700;"
        >
          £${result.price.toFixed(2)}
        </p>

      </div>

      <div class="quote-important">

        <h3>IMPORTANT</h3>

        <p>
          Your Instant Quote is based on the information
          and photographs you have provided.
        </p>

        <p>
          All equipment is physically inspected when received.
        </p>

        <p>
          If the equipment matches the information supplied,
          we will confirm the quoted price.
        </p>

        <p>
          If the condition, contents, flight time, ownership
          or other information differs materially, we may
          make a revised final offer.
        </p>

        <p>
          If you do not accept a revised offer, we will return
          the equipment to the full address you provide.
        </p>

      </div>

    `;

    const acceptButton =
      document.querySelector(".btn-accept");

    if (acceptButton) {

      acceptButton.textContent =
        "Accept Instant Quote & Continue";

    }

  }


  /* =========================================================
     PACKAGE CONTENTS
  ========================================================= */

  function populatePackageContents() {

    const container =
      document.getElementById(
        "package-contents-list"
      );

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const items = [
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

    items.forEach(function (item, index) {

      const wrapper =
        document.createElement("div");

      wrapper.style.marginBottom =
        "12px";

      wrapper.innerHTML = `

        <label>
          ${item}

          <select
            name="packageContents-${index}"
            required
          >

            <option value="">
              -- Select status --
            </option>

            <option value="present">
              Present
            </option>

            <option value="missing">
              Missing
            </option>

            <option value="additional">
              Additional
            </option>

          </select>

        </label>

      `;

      container.appendChild(wrapper);

    });

  }


  /* =========================================================
     DAMAGE DISPLAY
  ========================================================= */

  const damageInputs =
    form.querySelectorAll(
      'input[name="damage"]'
    );

  const damageDetails =
    document.getElementById(
      "damage-details"
    );

  damageInputs.forEach(function (input) {

    input.addEventListener(
      "change",
      function () {

        if (!damageDetails) {
          return;
        }

        if (
          input.checked &&
          input.value === "yes"
        ) {

          damageDetails.hidden = false;

        } else if (
          input.checked &&
          input.value === "no"
        ) {

          damageDetails.hidden = true;

        }

      }
    );

  });


  /* =========================================================
     MODEL CHANGE
  ========================================================= */

  if (modelSelect) {

    modelSelect.addEventListener(
      "change",
      function () {

        quoteData.model =
          modelSelect.value;

        populatePackages(
          modelSelect.value
        );

        if (packageSelect) {
          packageSelect.value = "";
        }

      }
    );

  }


  /* =========================================================
     PACKAGE CHANGE
  ========================================================= */

  if (packageSelect) {

    packageSelect.addEventListener(
      "change",
      function () {

        quoteData.package =
          packageSelect.value;

        populatePackageContents();

      }
    );

  }


  /* =========================================================
     NEXT / BACK / ACCEPT
  ========================================================= */

  form.addEventListener(
    "click",
    function (event) {

      const target =
        event.target.closest("button");

      if (!target) {
        return;
      }


      /* ADD BATTERY */

      if (
        target.id ===
        "add-battery-btn"
      ) {

        event.preventDefault();

        createBatteryEntry();

        return;

      }


      /* REMOVE BATTERY */

      if (
        target.classList.contains(
          "btn-remove-battery"
        )
      ) {

        event.preventDefault();

        const battery =
          target.closest(
            ".battery-entry"
          );

        if (battery) {
          battery.remove();
        }

        return;

      }


      /* BACK */

      if (
        target.classList.contains(
          "btn-back"
        )
      ) {

        event.preventDefault();

        if (currentStep > 0) {

          showStep(
            currentStep - 1
          );

        }

        return;

      }


      /* NEXT */

      if (
        target.classList.contains(
          "btn-next"
        )
      ) {

        event.preventDefault();

        if (
          !validateCurrentStep()
        ) {

          return;

        }


        /* When leaving photos,
           generate quote */

        if (currentStep === 10) {

          renderQuoteResult();

        }


        if (
          currentStep <
          steps.length - 1
        ) {

          showStep(
            currentStep + 1
          );

        }

        return;

      }


      /* ACCEPT INSTANT QUOTE */

      if (
        target.classList.contains(
          "btn-accept"
        )
      ) {

        event.preventDefault();


        if (manualValuation) {

          alert(
            "Your details will be submitted for manual valuation. A purchase price will be confirmed after review."
          );

          return;

        }


        quoteAccepted = true;


        /* Customer details is
           normally step 13,
           but find it safely by
           data-step */

        const customerIndex =
          steps.findIndex(function (step) {

            return step.dataset.step === "13";

          });


        if (customerIndex !== -1) {

          showStep(
            customerIndex
          );

        } else {

          /* Fallback */

          showStep(
            currentStep + 1
          );

        }

        return;

      }

    }
  );


  /* =========================================================
     FORM SUBMISSION
  ========================================================= */

  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      const customerIndex =
        steps.findIndex(function (step) {

          return step.dataset.step === "13";

        });


      if (
        customerIndex !== -1 &&
        currentStep === customerIndex
      ) {

        const customerStep =
          steps[customerIndex];

        const required =
          customerStep.querySelectorAll(
            "input[required]"
          );

        for (const input of required) {

          if (
            input.type === "radio"
          ) {

            continue;

          }

          if (
            !input.value.trim()
          ) {

            alert(
              "Please complete all required customer details."
            );

            input.focus();

            return;

          }

        }


        const legalRight =
          customerStep.querySelector(
            'input[name="legalRight"]:checked'
          );

        if (!legalRight) {

          alert(
            "Please confirm that you have the legal right to sell this equipment."
          );

          return;

        }


        if (
          legalRight.value === "no" ||
          legalRight.value === "not-sure"
        ) {

          alert(
            "We cannot automatically purchase equipment where ownership is uncertain. Please contact us for a manual review."
          );

          return;

        }


        collectCustomerDetails();

        const submittedIndex =
          steps.findIndex(function (step) {

            return step.dataset.step === "14";

          });


        if (
          submittedIndex !== -1
        ) {

          const reference =
            generateQuoteReference();

          const referenceElement =
            document.getElementById(
              "quote-reference"
            );

          if (referenceElement) {

            referenceElement.textContent =
              reference;

          }

          showStep(
            submittedIndex
          );

        }

      }

    }
  );


  /* =========================================================
     CUSTOMER DETAILS
  ========================================================= */

  function collectCustomerDetails() {

    function value(id) {

      const element =
        document.getElementById(id);

      return element
        ? element.value.trim()
        : "";

    }

    quoteData.fullName =
      value("full-name");

    quoteData.email =
      value("email-address");

    quoteData.phone =
      value("phone-number");

    quoteData.addressLine1 =
      value("address-line-1");

    quoteData.addressLine2 =
      value("address-line-2");

    quoteData.city =
      value("city");

    quoteData.county =
      value("county");

    quoteData.postcode =
      value("postcode");

  }


  /* =========================================================
     QUOTE REFERENCE
  ========================================================= */

  function generateQuoteReference() {

    const year =
      new Date().getFullYear();

    const random =
      Math.floor(
        100000 +
        Math.random() * 900000
      );

    return (
      "WBA-" +
      year +
      "-" +
      random
    );

  }


  /* =========================================================
     INITIALISE
  ========================================================= */

  populateModels();

  showStep(0);


  /* =========================================================
     BATTERY INITIALISATION
     
     Do NOT automatically add a battery.
     Customer clicks ADD BATTERY.
  ========================================================= */

  console.log(
    "WE BUY ANY DRONE quote wizard loaded successfully."
  );

});
