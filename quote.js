/* ============================================================
   WE BUY ANY DRONE
   INSTANT QUOTE WIZARD
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

  "use strict";

  /* ==========================================================
     1. MODEL DATABASE
     ========================================================== */

  const droneDatabase = {

    dji: {

      "dji-mini": {
        name: "DJI Mini",
        category: "Mini"
      },

      "mini-se": {
        name: "DJI Mini SE",
        category: "Mini"
      },

      "mini-2": {
        name: "DJI Mini 2",
        category: "Mini"
      },

      "mini-2-se": {
        name: "DJI Mini 2 SE",
        category: "Mini"
      },

      "mini-3": {
        name: "DJI Mini 3",
        category: "Mini"
      },

      "mini-3-pro": {
        name: "DJI Mini 3 Pro",
        category: "Mini"
      },

      "mini-4-pro": {
        name: "DJI Mini 4 Pro",
        category: "Mini"
      },

      "mini-5-pro": {
        name: "DJI Mini 5 Pro",
        category: "Mini"
      },

      "neo": {
        name: "DJI Neo",
        category: "Neo"
      },

      "neo-2": {
        name: "DJI Neo 2",
        category: "Neo"
      },

      "lito-1": {
        name: "DJI Lito 1",
        category: "Lito"
      },

      "lito-x1": {
        name: "DJI Lito X1",
        category: "Lito"
      },

      "flip": {
        name: "DJI Flip",
        category: "Flip"
      },

      "air": {
        name: "DJI Air",
        category: "Air"
      },

      "air-2": {
        name: "DJI Air 2",
        category: "Air"
      },

      "air-2s": {
        name: "DJI Air 2S",
        category: "Air"
      },

      "air-3": {
        name: "DJI Air 3",
        category: "Air"
      },

      "air-3s": {
        name: "DJI Air 3S",
        category: "Air"
      },

      "mavic-mini": {
        name: "DJI Mavic Mini",
        category: "Mavic"
      },

      "mavic-pro": {
        name: "DJI Mavic Pro",
        category: "Mavic"
      },

      "mavic-2-pro": {
        name: "DJI Mavic 2 Pro",
        category: "Mavic"
      },

      "mavic-2-zoom": {
        name: "DJI Mavic 2 Zoom",
        category: "Mavic"
      },

      "mavic-3": {
        name: "DJI Mavic 3",
        category: "Mavic"
      },

      "mavic-3-classic": {
        name: "DJI Mavic 3 Classic",
        category: "Mavic"
      },

      "mavic-3-pro": {
        name: "DJI Mavic 3 Pro",
        category: "Mavic"
      },

      "mavic-3-pro-cine": {
        name: "DJI Mavic 3 Pro Cine",
        category: "Mavic"
      },

      "mavic-4-pro": {
        name: "DJI Mavic 4 Pro",
        category: "Mavic"
      },

      "fpv": {
        name: "DJI FPV",
        category: "FPV"
      },

      "avata": {
        name: "DJI Avata",
        category: "FPV"
      },

      "avata-2": {
        name: "DJI Avata 2",
        category: "FPV"
      },

      "avata-360": {
        name: "DJI Avata 360",
        category: "FPV"
      },

      "mavic-3-enterprise": {
        name: "DJI Mavic 3 Enterprise",
        category: "Professional"
      },

      "mavic-3-thermal": {
        name: "DJI Mavic 3 Thermal",
        category: "Professional"
      },

      "mavic-3-multispectral": {
        name: "DJI Mavic 3 Multispectral",
        category: "Professional"
      },

      "matrice-4e": {
        name: "DJI Matrice 4E",
        category: "Professional"
      },

      "matrice-4t": {
        name: "DJI Matrice 4T",
        category: "Professional"
      },

      "matrice-30": {
        name: "DJI Matrice 30",
        category: "Professional"
      },

      "matrice-30t": {
        name: "DJI Matrice 30T",
        category: "Professional"
      },

      "matrice-300-rtk": {
        name: "DJI Matrice 300 RTK",
        category: "Professional"
      },

      "matrice-350-rtk": {
        name: "DJI Matrice 350 RTK",
        category: "Professional"
      },

      "matrice-400": {
        name: "DJI Matrice 400",
        category: "Professional"
      },

      "inspire-1": {
        name: "DJI Inspire 1",
        category: "Professional"
      },

      "inspire-2": {
        name: "DJI Inspire 2",
        category: "Professional"
      },

      "inspire-3": {
        name: "DJI Inspire 3",
        category: "Professional"
      },

      "agras": {
        name: "DJI Agras",
        category: "Professional"
      }

    }

  };


  /* ==========================================================
     2. PACKAGE DATABASE
     ========================================================== */

  const packageDatabase = {

    "mini-5-pro": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "standard-rc-n3",
        name: "Standard + RC-N3",
        contents: [
          "Drone",
          "RC-N3 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc-n3",
        name: "Fly More Combo + RC-N3",
        contents: [
          "Drone",
          "RC-N3 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Power Supply",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc2",
        name: "Fly More Combo + RC 2",
        contents: [
          "Drone",
          "DJI RC 2 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Power Supply",
          "Cables"
        ]
      },

      {
        id: "fly-more-plus-rc2",
        name: "Fly More Combo Plus + RC 2",
        contents: [
          "Drone",
          "DJI RC 2 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Power Supply",
          "Cables"
        ]
      }

    ],

    "mini-4-pro": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "standard-rc-n2",
        name: "Standard + RC-N2",
        contents: [
          "Drone",
          "RC-N2 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "standard-rc2",
        name: "Standard + RC 2",
        contents: [
          "Drone",
          "DJI RC 2 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc-n2",
        name: "Fly More Combo + RC-N2",
        contents: [
          "Drone",
          "RC-N2 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc2",
        name: "Fly More Combo + RC 2",
        contents: [
          "Drone",
          "DJI RC 2 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      }

    ],

    "mini-3-pro": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "drone-rc-n1",
        name: "Drone + RC-N1",
        contents: [
          "Drone",
          "RC-N1 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "drone-dji-rc",
        name: "Drone + DJI RC",
        contents: [
          "Drone",
          "DJI RC Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc-n1",
        name: "Fly More Combo + RC-N1",
        contents: [
          "Drone",
          "RC-N1 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-dji-rc",
        name: "Fly More Combo + DJI RC",
        contents: [
          "Drone",
          "DJI RC Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      }

    ],

    "mini-3": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "standard-rc-n1",
        name: "Standard + RC-N1",
        contents: [
          "Drone",
          "RC-N1 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc-n1",
        name: "Fly More Combo + RC-N1",
        contents: [
          "Drone",
          "RC-N1 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      }

    ],

    "mini-2": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "standard-rc-n1",
        name: "Standard + RC-N1",
        contents: [
          "Drone",
          "RC-N1 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more",
        name: "Fly More Combo",
        contents: [
          "Drone",
          "Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Propellers",
          "Cables"
        ]
      }

    ],

    "neo": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone",
          "Battery",
          "Cables"
        ]
      },

      {
        id: "fly-more",
        name: "Fly More Combo",
        contents: [
          "Drone",
          "Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Cables"
        ]
      }

    ],

    "neo-2": [

      {
        id: "standard",
        name: "Standard Package",
        contents: [
          "Drone",
          "Battery",
          "Cables"
        ]
      },

      {
        id: "fly-more",
        name: "Fly More Combo",
        contents: [
          "Drone",
          "Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Cables"
        ]
      }

    ],

    "flip": [

      {
        id: "standard-rc-n3",
        name: "Standard + RC-N3",
        contents: [
          "Drone",
          "RC-N3 Controller",
          "Battery",
          "Propellers",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc-n3",
        name: "Fly More Combo + RC-N3",
        contents: [
          "Drone",
          "RC-N3 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Cables"
        ]
      },

      {
        id: "fly-more-rc2",
        name: "Fly More Combo + RC 2",
        contents: [
          "Drone",
          "DJI RC 2 Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Cables"
        ]
      }

    ],

    "avata": [

      {
        id: "drone-only",
        name: "Drone Only",
        contents: [
          "Drone"
        ]
      },

      {
        id: "fly-smart",
        name: "Fly Smart Combo",
        contents: [
          "Drone",
          "Goggles",
          "Controller",
          "Battery",
          "Charger"
        ]
      },

      {
        id: "pro-view",
        name: "Pro-View Combo",
        contents: [
          "Drone",
          "Goggles",
          "Controller",
          "Battery",
          "Charger"
        ]
      },

      {
        id: "explorer",
        name: "Explorer Combo",
        contents: [
          "Drone",
          "Goggles",
          "Controller",
          "Battery",
          "Charger"
        ]
      }

    ],

    "avata-2": [

      {
        id: "standard",
        name: "Standard Package",
        contents: [
          "Drone",
          "Goggles",
          "Controller",
          "Battery",
          "Charger"
        ]
      },

      {
        id: "fly-more",
        name: "Fly More Combo",
        contents: [
          "Drone",
          "Goggles",
          "Controller",
          "Battery 1",
          "Battery 2",
          "Battery 3",
          "Charging Hub",
          "Bag",
          "Cables"
        ]
      }

    ]

  };


  /* ==========================================================
     3. DEFAULT PACKAGE DATABASE
     ========================================================== */

  const defaultPackages = [

    {
      id: "drone-only",
      name: "Drone Only",
      contents: [
        "Drone"
      ]
    },

    {
      id: "standard",
      name: "Standard Package",
      contents: [
        "Drone",
        "Controller",
        "Battery",
        "Cables"
      ]
    },

    {
      id: "fly-more",
      name: "Fly More Combo",
      contents: [
        "Drone",
        "Controller",
        "Battery 1",
        "Battery 2",
        "Battery 3",
        "Charging Hub",
        "Bag",
        "Cables"
      ]
    }

  ];


  /* ==========================================================
     4. PRICING DATABASE
     ==========================================================

     IMPORTANT:

     These are intentionally TBC until verified purchase prices
     are entered.

     DO NOT scatter prices through the HTML.

     To add a verified price later, change basePrice from null
     to the actual purchase price.

     Example:

     basePrice: 650

     ========================================================== */

  const pricingDatabase = {

    "mini-5-pro": {

      manualValuation: false,

      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: null
        },

        "standard-rc-n3": {
          basePrice: null,
          floorPrice: null
        },

        "fly-more-rc-n3": {
          basePrice: null,
          floorPrice: null
        },

        "fly-more-rc2": {
          basePrice: null,
          floorPrice: null
        },

        "fly-more-plus-rc2": {
          basePrice: null,
          floorPrice: null
        }

      }

    },

    "mini-4-pro": {

      manualValuation: false,

      packages: {}

    },

    "mini-3-pro": {

      manualValuation: false,

      packages: {}

    },

    "mini-3": {

      manualValuation: false,

      packages: {}

    },

    "mini-2": {

      manualValuation: false,

      packages: {}

    },

    "neo": {

      manualValuation: false,

      packages: {}

    },

    "neo-2": {

      manualValuation: false,

      packages: {}

    },

    "flip": {

      manualValuation: false,

      packages: {}

    },

    "avata": {

      manualValuation: false,

      packages: {}

    },

    "avata-2": {

      manualValuation: false,

      packages: {}

    }

  };


  /* ==========================================================
     5. PROFESSIONAL / HIGH VALUE MODELS
     ========================================================== */

  const manualValuationCategories = [
    "Professional"
  ];


  /* ==========================================================
     6. CONDITION DEDUCTIONS
     ========================================================== */

  const conditionDeductions = {

    "factory-sealed": 0,
    "opened-unused": 0,
    "excellent": 0,
    "good": 0,
    "fair": 0,
    "damaged": 0,
    "not-working": 0

  };


  /* ==========================================================
     7. FLIGHT-TIME DEDUCTIONS
     ========================================================== */

  const flightDeductions = {

    "0-5": 0,
    "5-20": 0,
    "20-50": 0,
    "50-100": 0,
    "100-150": 0,
    "150-200": 0,
    "200+": null

  };


  /* ==========================================================
     8. BATTERY DEDUCTIONS
     ========================================================== */

  function batteryCycleDeduction(cycles) {

    const number = Number(cycles);

    if (!Number.isFinite(number)) {
      return 0;
    }

    if (number <= 100) {
      return 0;
    }

    if (number <= 200) {
      return 0;
    }

    if (number <= 300) {
      return 0;
    }

    return 0;
  }


  /* ==========================================================
     9. DOM REFERENCES
     ========================================================== */

  const form = document.getElementById("quote-form");

  if (!form) {
    console.error("QUOTE ERROR: #quote-form was not found.");
    return;
  }

  const steps = Array.from(
    form.querySelectorAll(".wizard-step")
  );

  const progressItems = Array.from(
    document.querySelectorAll(".progress-step")
  );

  const modelSelect =
    document.getElementById("dji-model");

  const packageSelect =
    document.getElementById("package-select");

  const batteriesContainer =
    document.getElementById("batteries-container");

  const addBatteryButton =
    document.getElementById("add-battery-btn");

  const packageContentsList =
    document.getElementById("package-contents-list");

  const quoteSummary =
    document.getElementById("quote-summary");

  const quoteReference =
    document.getElementById("quote-reference");

  const unboundWarning =
    document.getElementById("unbound-warning");

  const damageDetails =
    document.getElementById("damage-details");

  const ownershipWarning =
    document.getElementById("ownership-warning");


  /* ==========================================================
     10. WIZARD STATE
     ========================================================== */

  let currentStep = 0;

  let batteryCount = 0;

  let currentPackageContents = [];


  /* ==========================================================
     11. SHOW STEP
     ========================================================== */

  function showStep(index) {

    if (index < 0 || index >= steps.length) {
      return;
    }

    steps.forEach(function (step, stepIndex) {

      step.hidden = stepIndex !== index;

    });


    progressItems.forEach(function (item, progressIndex) {

      if (progressIndex === index) {

        item.setAttribute(
          "aria-current",
          "step"
        );

      } else {

        item.removeAttribute(
          "aria-current"
        );

      }

    });


    currentStep = index;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  /* ==========================================================
     12. ERROR MESSAGE
     ========================================================== */

  function showError(message) {

    alert(message);

  }


  /* ==========================================================
     13. MANUFACTURER
     ========================================================== */

  function getSelectedManufacturer() {

    const selected =
      form.querySelector(
        'input[name="manufacturer"]:checked'
      );

    return selected ? selected.value : "";

  }


  function validateManufacturer() {

    const manufacturer =
      getSelectedManufacturer();

    if (!manufacturer) {

      showError(
        "Please select a manufacturer."
      );

      return false;
    }

    return true;

  }


  /* ==========================================================
     14. POPULATE MODELS
     ========================================================== */

  function populateModels() {

    if (!modelSelect) {
      return;
    }

    modelSelect.innerHTML =
      '<option value="">-- Select a model --</option>';


    const manufacturer =
      getSelectedManufacturer();


    if (
      !manufacturer ||
      !droneDatabase[manufacturer]
    ) {
      return;
    }


    const models =
      droneDatabase[manufacturer];


    Object.keys(models).forEach(function (modelId) {

      const option =
        document.createElement("option");

      option.value = modelId;

      option.textContent =
        models[modelId].name;

      modelSelect.appendChild(option);

    });

  }


  /* ==========================================================
     15. MODEL VALIDATION
     ========================================================== */

  function validateModel() {

    if (!modelSelect || !modelSelect.value) {

      showError(
        "Please select your DJI model."
      );

      return false;
    }

    return true;

  }


  /* ==========================================================
     16. POPULATE PACKAGES
     ========================================================== */

  function populatePackages() {

    if (!packageSelect) {
      return;
    }


    packageSelect.innerHTML =
      '<option value="">-- Select a package --</option>';


    const modelId =
      modelSelect.value;


    let packages =
      packageDatabase[modelId];


    if (!packages) {
      packages = defaultPackages;
    }


    packages.forEach(function (packageData) {

      const option =
        document.createElement("option");

      option.value =
        packageData.id;

      option.textContent =
        packageData.name;

      packageSelect.appendChild(option);

    });

  }


  /* ==========================================================
     17. PACKAGE VALIDATION
     ========================================================== */

  function validatePackage() {

    if (
      !packageSelect ||
      !packageSelect.value
    ) {

      showError(
        "Please select the exact package."
      );

      return false;
    }

    return true;

  }


  /* ==========================================================
     18. CONDITION VALIDATION
     ========================================================== */

  function validateCondition() {

    const selected =
      form.querySelector(
        'input[name="condition"]:checked'
      );

    if (!selected) {

      showError(
        "Please select the condition of the drone."
      );

      return false;
    }

    return true;

  }


  /* ==========================================================
     19. FLIGHT TIME
     ========================================================== */

  function getFlightRange() {

    const selected =
      form.querySelector(
        'input[name="flightHoursRange"]:checked'
      );

    if (selected) {
      return selected.value;
    }

    const hoursInput =
      document.getElementById(
        "flight-hours"
      );

    if (
      !hoursInput ||
      hoursInput.value === ""
    ) {
      return "";
    }


    const hours =
      Number(hoursInput.value);


    if (hours < 5) {
      return "0-5";
    }

    if (hours < 20) {
      return "5-20";
    }

    if (hours < 50) {
      return "20-50";
    }

    if (hours < 100) {
      return "50-100";
    }

    if (hours < 150) {
      return "100-150";
    }

    if (hours < 200) {
      return "150-200";
    }

    return "200+";

  }


  function validateFlightTime() {

    const hoursInput =
      document.getElementById(
        "flight-hours"
      );


    const range =
      form.querySelector(
        'input[name="flightHoursRange"]:checked'
      );


    if (
      (!hoursInput ||
       hoursInput.value === "") &&
      !range
    ) {

      showError(
        "Please enter the total flight hours or select a flight-time range."
      );

      return false;
    }


    if (
      hoursInput &&
      hoursInput.value !== ""
    ) {

      const hours =
        Number(hoursInput.value);

      if (
        !Number.isFinite(hours) ||
        hours < 0
      ) {

        showError(
          "Please enter a valid flight-hour figure."
        );

        return false;
      }

    }

    return true;

  }


  /* ==========================================================
     20. BATTERY CREATION
     ========================================================== */

  function createBatteryEntry() {

    if (!batteriesContainer) {
      return;
    }


    batteryCount += 1;


    const entry =
      document.createElement("div");


    entry.className =
      "battery-entry";


    entry.dataset.batteryNumber =
      String(batteryCount);


    entry.innerHTML = `

      <h4>Battery ${batteryCount}</h4>

      <label>
        Battery Type
        <input
          type="text"
          class="battery-type"
          name="batteryType${batteryCount}"
          placeholder="e.g. Intelligent Flight Battery"
        >
      </label>

      <label>
        Battery Cycle Count
        <input
          type="number"
          class="battery-cycles"
          name="batteryCycles${batteryCount}"
          min="0"
          step="1"
          placeholder="e.g. 42"
        >
      </label>

      <button
        type="button"
        class="btn-remove-battery">
        Remove Battery
      </button>

    `;


    batteriesContainer.appendChild(entry);

  }


  /* ==========================================================
     21. BATTERY VALIDATION
     ========================================================== */

  function validateBatteries() {

    if (!batteriesContainer) {

      showError(
        "Battery section could not be loaded."
      );

      return false;
    }


    const batteries =
      Array.from(
        batteriesContainer.querySelectorAll(
          ".battery-entry"
        )
      );


    if (batteries.length === 0) {

      showError(
        "Please click Add Battery and enter at least one battery."
      );

      return false;
    }


    for (
      let i = 0;
      i < batteries.length;
      i++
    ) {

      const type =
        batteries[i].querySelector(
          ".battery-type"
        );

      const cycles =
        batteries[i].querySelector(
          ".battery-cycles"
        );


      if (
        !type ||
        !type.value.trim()
      ) {

        showError(
          "Please enter the battery type for every battery."
        );

        return false;
      }


      if (
        !cycles ||
        cycles.value === ""
      ) {

        showError(
          "Please enter the battery cycle count for every battery."
        );

        return false;
      }


      const cycleNumber =
        Number(cycles.value);


      if (
        !Number.isFinite(cycleNumber) ||
        cycleNumber < 0
      ) {

        showError(
          "Battery cycle counts must be zero or greater."
        );

        return false;
      }

    }


    return true;

  }


  /* ==========================================================
     22. UNBOUND
     ========================================================== */

  function validateUnbound() {

    const selected =
      form.querySelector(
        'input[name="unbound"]:checked'
      );


    if (!selected) {

      showError(
        "Please tell us whether the drone is unbound."
      );

      return false;
    }


    if (
      unboundWarning &&
      selected.value === "no"
    ) {

      unboundWarning.hidden = false;

    }


    return true;

  }


  /* ==========================================================
     23. DAMAGE
     ========================================================== */

  function validateDamage() {

    const selected =
      form.querySelector(
        'input[name="damage"]:checked'
      );


    if (!selected) {

      showError(
        "Please tell us whether the drone has any damage."
      );

      return false;
    }


    if (
      selected.value === "yes"
    ) {

      const description =
        document.getElementById(
          "damage-description"
        );


      if (
        !description ||
        !description.value.trim()
      ) {

        showError(
          "Please describe the damage."
        );

        return false;
      }

    }


    return true;

  }


  /* ==========================================================
     24. PACKAGE CONTENTS
     ========================================================== */

  function populatePackageContents() {

    if (!packageContentsList) {
      return;
    }


    packageContentsList.innerHTML = "";


    const modelId =
      modelSelect.value;


    const packageId =
      packageSelect.value;


    let packages =
      packageDatabase[modelId];


    if (!packages) {
      packages = defaultPackages;
    }


    const selectedPackage =
      packages.find(function (item) {

        return item.id === packageId;

      });


    if (!selectedPackage) {

      packageContentsList.innerHTML =
        "<p>Package contents will appear here.</p>";

      return;

    }


    currentPackageContents =
      selectedPackage.contents.slice();


    selectedPackage.contents.forEach(
      function (item, index) {

        const wrapper =
          document.createElement("div");

        wrapper.className =
          "package-content-item";


        wrapper.innerHTML = `

          <strong>${item}</strong>

          <label>
            <input
              type="radio"
              name="content-${index}"
              value="present"
              checked
            >
            Present
          </label>

          <label>
            <input
              type="radio"
              name="content-${index}"
              value="missing"
            >
            Missing
          </label>

          <label>
            <input
              type="radio"
              name="content-${index}"
              value="additional"
            >
            Additional
          </label>

        `;


        packageContentsList.appendChild(
          wrapper
        );

      }
    );

  }


  /* ==========================================================
     25. SERIAL NUMBER VALIDATION
     ========================================================== */

  function validateSerialNumbers() {

    const droneSerial =
      document.getElementById(
        "drone-serial-number"
      );


    if (
      !droneSerial ||
      !droneSerial.value.trim()
    ) {

      showError(
        "Please enter the drone serial number."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     26. PHOTO VALIDATION
     ========================================================== */

  function validatePhotos() {

    const photoInput =
      document.getElementById(
        "photo-uploads"
      );


    if (
      !photoInput ||
      !photoInput.files ||
      photoInput.files.length === 0
    ) {

      showError(
        "Please upload at least one photograph. You can select multiple photographs at once."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     27. OWNERSHIP
     ========================================================== */

  function validateOwnership() {

    const selected =
      form.querySelector(
        'input[name="legalRight"]:checked'
      );


    if (!selected) {

      showError(
        "Please confirm whether you have the legal right to sell this equipment."
      );

      return false;

    }


    if (
      selected.value === "no" ||
      selected.value === "not-sure"
    ) {

      if (ownershipWarning) {
        ownershipWarning.hidden = false;
      }


      showError(
        "We cannot automatically purchase equipment where ownership is uncertain. Please contact us for a manual review."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     28. CUSTOMER DETAILS
     ========================================================== */

  function validateCustomerDetails() {

    const requiredIds = [

      "full-name",
      "email-address",
      "phone-number",
      "address-line-1",
      "city",
      "postcode"

    ];


    for (
      let i = 0;
      i < requiredIds.length;
      i++
    ) {

      const element =
        document.getElementById(
          requiredIds[i]
        );


      if (
        !element ||
        !element.value.trim()
      ) {

        showError(
          "Please complete all required customer and return-address fields."
        );

        if (element) {
          element.focus();
        }

        return false;

      }

    }


    const email =
      document.getElementById(
        "email-address"
      );


    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !emailPattern.test(
        email.value.trim()
      )
    ) {

      showError(
        "Please enter a valid email address."
      );

      email.focus();

      return false;

    }


    const phone =
      document.getElementById(
        "phone-number"
      );


    const phoneDigits =
      phone.value.replace(
        /[^0-9+]/g,
        ""
      );


    if (
      phoneDigits.length < 7
    ) {

      showError(
        "Please enter a valid telephone number."
      );

      phone.focus();

      return false;

    }


    const postcode =
      document.getElementById(
        "postcode"
      );


    const postcodePattern =
      /^[A-Z0-9]{2,4}\s?[A-Z0-9]{3}$/i;


    if (
      !postcodePattern.test(
        postcode.value.trim()
      )
    ) {

      showError(
        "Please enter a valid UK postcode."
      );

      postcode.focus();

      return false;

    }


    return validateOwnership();

  }


  /* ==========================================================
     29. PRICING ENGINE
     ========================================================== */

  function calculateQuote() {

    const modelId =
      modelSelect.value;


    const packageId =
      packageSelect.value;


    const model =
      droneDatabase.dji[modelId];


    if (!model) {

      return {
        manual: true,
        reason: "Model not found."
      };

    }


    if (
      manualValuationCategories.includes(
        model.category
      )
    ) {

      return {
        manual: true,
        reason:
          "High-value professional equipment requires manual valuation."
      };

    }


    const modelPricing =
      pricingDatabase[modelId];


    if (
      !modelPricing
    ) {

      return {
        manual: true,
        reason:
          "This model has not yet been given a verified automatic purchase price."
      };

    }


    const packagePricing =
      modelPricing.packages[packageId];


    if (
      !packagePricing ||
      packagePricing.basePrice === null
    ) {

      return {
        manual: true,
        reason:
          "A verified purchase price has not yet been entered for this package."
      };

    }


    let value =
      Number(packagePricing.basePrice);


    const floor =
      packagePricing.floorPrice === null
        ? 0
        : Number(packagePricing.floorPrice);


    const flightRange =
      getFlightRange();


    const flightDeduction =
      flightDeductions[flightRange];


    if (
      flightDeduction === null
    ) {

      return {
        manual: true,
        reason:
          "The reported flight time requires manual valuation."
      };

    }


    if (
      typeof flightDeduction === "number"
    ) {

      value -= flightDeduction;

    }


    const condition =
      form.querySelector(
        'input[name="condition"]:checked'
      );


    if (condition) {

      value -=
        Number(
          conditionDeductions[
            condition.value
          ] || 0
        );

    }


    const batteries =
      batteriesContainer
        ? Array.from(
            batteriesContainer.querySelectorAll(
              ".battery-entry"
            )
          )
        : [];


    batteries.forEach(
      function (battery) {

        const cycles =
          battery.querySelector(
            ".battery-cycles"
          );


        if (cycles) {

          value -=
            batteryCycleDeduction(
              cycles.value
            );

        }

      }
    );


    if (value < floor) {

      return {
        manual: true,
        reason:
          "The calculated value is below the automatic purchase floor."
      };

    }


    return {

      manual: false,

      value: Math.max(
        0,
        Math.round(value)
      )

    };

  }


  /* ==========================================================
     30. QUOTE RESULT
     ========================================================== */

  function displayQuote() {

    if (!quoteSummary) {
      return;
    }


    const modelId =
      modelSelect.value;


    const model =
      droneDatabase.dji[modelId];


    const packageId =
      packageSelect.value;


    let packages =
      packageDatabase[modelId];


    if (!packages) {
      packages = defaultPackages;
    }


    const selectedPackage =
      packages.find(function (item) {

        return item.id === packageId;

      });


    const condition =
      form.querySelector(
        'input[name="condition"]:checked'
      );


    const quote =
      calculateQuote();


    if (quote.manual) {

      quoteSummary.innerHTML = `

        <div class="manual-valuation">

          <h4>MANUAL VALUATION REQUIRED</h4>

          <p>
            We need to manually assess this equipment before
            confirming a purchase price.
          </p>

          <p>
            <strong>Reason:</strong>
            ${quote.reason}
          </p>

          <p>
            Your information can still be submitted for review.
          </p>

        </div>

      `;

      return;

    }


    quoteSummary.innerHTML = `

      <div class="quote-result">

        <h4>YOUR INSTANT QUOTE</h4>

        <p>
          <strong>Model:</strong>
          ${model ? model.name : ""}
        </p>

        <p>
          <strong>Package:</strong>
          ${selectedPackage
            ? selectedPackage.name
            : ""}
        </p>

        <p>
          <strong>Condition:</strong>
          ${condition
            ? condition.parentElement.textContent.trim()
            : ""}
        </p>

        <div class="quote-price">

          £${quote.value.toLocaleString(
            "en-GB"
          )}

        </div>

        <p>
          Estimated purchase price
        </p>

      </div>

    `;

  }


  /* ==========================================================
     31. QUOTE REFERENCE
     ========================================================== */

  function generateQuoteReference() {

    const year =
      new Date().getFullYear();


    const random =
      Math.floor(
        100000 +
        Math.random() * 900000
      );


    return "WBA-" +
      year +
      "-" +
      random;

  }


  /* ==========================================================
     32. UNBOUND CHANGE
     ========================================================== */

  const unboundInputs =
    form.querySelectorAll(
      'input[name="unbound"]'
    );


  unboundInputs.forEach(
    function (input) {

      input.addEventListener(
        "change",
        function () {

          if (!unboundWarning) {
            return;
          }


          if (
            input.checked &&
            input.value === "no"
          ) {

            unboundWarning.hidden =
              false;

          } else {

            unboundWarning.hidden =
              true;

          }

        }
      );

    }
  );


  /* ==========================================================
     33. DAMAGE CHANGE
     ========================================================== */

  const damageInputs =
    form.querySelectorAll(
      'input[name="damage"]'
    );


  damageInputs.forEach(
    function (input) {

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

            damageDetails.hidden =
              false;

          } else {

            damageDetails.hidden =
              true;

          }

        }
      );

    }
  );


  /* ==========================================================
     34. MODEL CHANGE
     ========================================================== */

  if (modelSelect) {

    modelSelect.addEventListener(
      "change",
      function () {

        populatePackages();

        if (packageContentsList) {
          packageContentsList.innerHTML = "";
        }

      }
    );

  }


  /* ==========================================================
     35. PACKAGE CHANGE
     ========================================================== */

  if (packageSelect) {

    packageSelect.addEventListener(
      "change",
      function () {

        populatePackageContents();

      }
    );

  }


  /* ==========================================================
     36. ADD BATTERY
     ========================================================== */

  if (addBatteryButton) {

    addBatteryButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        createBatteryEntry();

      }
    );

  }


  /* ==========================================================
     37. REMOVE BATTERY
     ========================================================== */

  if (batteriesContainer) {

    batteriesContainer.addEventListener(
      "click",
      function (event) {

        if (
          event.target.classList.contains(
            "btn-remove-battery"
          )
        ) {

          event.preventDefault();

          const entry =
            event.target.closest(
              ".battery-entry"
            );


          if (entry) {

            entry.remove();

          }

        }

      }
    );

  }


  /* ==========================================================
     38. BACK BUTTONS
     ========================================================== */

  const backButtons =
    form.querySelectorAll(
      ".btn-back"
    );


  backButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          if (currentStep > 0) {

            showStep(
              currentStep - 1
            );

          }

        }
      );

    }
  );


  /* ==========================================================
     39. NEXT BUTTONS
     ========================================================== */

  const nextButtons =
    form.querySelectorAll(
      ".btn-next"
    );


  nextButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();


          /* STEP 1 */

          if (currentStep === 0) {

            if (
              !validateManufacturer()
            ) {
              return;
            }


            populateModels();

            showStep(1);

            return;

          }


          /* STEP 2 */

          if (currentStep === 1) {

            if (
              !validateModel()
            ) {
              return;
            }


            populatePackages();

            showStep(2);

            return;

          }


          /* STEP 3 */

          if (currentStep === 2) {

            if (
              !validatePackage()
            ) {
              return;
            }


            populatePackageContents();

            showStep(3);

            return;

          }


          /* STEP 4 */

          if (currentStep === 3) {

            if (
              !validateCondition()
            ) {
              return;
            }


            showStep(4);

            return;

          }


          /* STEP 5 */

          if (currentStep === 4) {

            if (
              !validateFlightTime()
            ) {
              return;
            }


            showStep(5);

            return;

          }


          /* STEP 6 */

          if (currentStep === 5) {

            if (
              !validateBatteries()
            ) {
              return;
            }


            showStep(6);

            return;

          }


          /* STEP 7 */

          if (currentStep === 6) {

            if (
              !validateUnbound()
            ) {
              return;
            }


            showStep(7);

            return;

          }


          /* STEP 8 */

          if (currentStep === 7) {

            if (
              !validateDamage()
            ) {
              return;
            }


            showStep(8);

            return;

          }


          /* STEP 9 */

          if (currentStep === 8) {

            showStep(9);

            return;

          }


          /* STEP 10 */

          if (currentStep === 9) {

            if (
              !validateSerialNumbers()
            ) {
              return;
            }


            showStep(10);

            return;

          }


          /* STEP 11 */

          if (currentStep === 10) {

            if (
              !validatePhotos()
            ) {
              return;
            }


            displayQuote();

            showStep(11);

            return;

          }


          /* STEP 12 */

          if (currentStep === 11) {

            showStep(12);

            return;

          }


          /* STEP 14 */

          if (currentStep === 13) {

            showStep(14);

            return;

          }


          /* STEP 15 */

          if (currentStep === 14) {

            showStep(15);

            return;

          }

        }
      );

    }
  );


  /* ==========================================================
     40. ACCEPT INSTANT QUOTE
     ========================================================== */

  const acceptButton =
    form.querySelector(
      ".btn-accept"
    );


  if (acceptButton) {

    acceptButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        showStep(12);

      }
    );

  }


  /* ==========================================================
     41. SUBMIT CUSTOMER DETAILS
     ========================================================== */

  const submitButton =
    form.querySelector(
      ".btn-submit"
    );


  if (submitButton) {

    submitButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();


        if (
          !validateCustomerDetails()
        ) {
          return;
        }


        const reference =
          generateQuoteReference();


        if (quoteReference) {

          quoteReference.textContent =
            reference;

        }


        showStep(13);

      }
    );

  }


  /* ==========================================================
     42. INITIALISE
     ========================================================== */

  populateModels();

  showStep(0);


  console.log(
    "WE BUY ANY DRONE quote wizard loaded successfully."
  );

});
