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
          "Drone"
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
          "Charging Hub",
          "Bag",
          "Propellers",
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
          "Controller",
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
          "Charger",
          "Cables"
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
          "Charger",
          "Cables"
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
          "Charger",
          "Cables"
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
          "Charger",
          "Cables"
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
     3. DEFAULT PACKAGE
     ========================================================== */

  const defaultPackages = [

    {
      id: "standard",
      name: "Standard Package",
      contents: [
        "Drone",
        "Controller",
        "Battery",
        "Propellers",
        "Cables"
      ]
    }

  ];


  /* ==========================================================
     4. PRICING DATABASE
     ========================================================== */

  /*
     IMPORTANT:

     Prices are intentionally TBC until verified.

     A package with basePrice:null goes to manual valuation.

     The database can be populated later without changing the
     HTML or wizard logic.
  */

  const pricingDatabase = {

    "mini-5-pro": {
      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: 0
        },

        "standard-rc-n3": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc-n3": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc2": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-plus-rc2": {
          basePrice: null,
          floorPrice: 0
        }

      }
    },

    "mini-4-pro": {
      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: 0
        },

        "standard-rc-n2": {
          basePrice: null,
          floorPrice: 0
        },

        "standard-rc2": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc-n2": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc2": {
          basePrice: null,
          floorPrice: 0
        }

      }
    },

    "mini-3-pro": {
      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: 0
        },

        "drone-rc-n1": {
          basePrice: null,
          floorPrice: 0
        },

        "drone-dji-rc": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc-n1": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-dji-rc": {
          basePrice: null,
          floorPrice: 0
        }

      }
    },

    "mini-3": {
      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: 0
        },

        "standard-rc-n1": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more-rc-n1": {
          basePrice: null,
          floorPrice: 0
        }

      }
    },

    "mini-2": {
      packages: {

        "drone-only": {
          basePrice: null,
          floorPrice: 0
        },

        "standard-rc-n1": {
          basePrice: null,
          floorPrice: 0
        },

        "fly-more": {
          basePrice: null,
          floorPrice: 0
        }

      }
    }

  };


  /* ==========================================================
     5. PRICING RULES
     ========================================================== */

  const flightDeductions = {

    "0-5": 0,

    "5-20": 10,

    "20-50": 25,

    "50-100": 50,

    "100-150": 75,

    "150-200": 100,

    "200+": null

  };


  const conditionDeductions = {

    "factory-sealed": 0,

    "opened-unused": 0,

    "excellent": 0,

    "good": 25,

    "fair": 50,

    "damaged": 100,

    "not-working": 150

  };


  const manualValuationCategories = [
    "Professional"
  ];


  /* ==========================================================
     6. DOM ELEMENTS
     ========================================================== */

  const form = document.getElementById("quote-form");

  if (!form) {
    console.error("WE BUY ANY DRONE: quote-form not found.");
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

  const packageContentsList =
    document.getElementById("package-contents-list");

  const quoteSummary =
    document.getElementById("quote-summary");

  const quoteReference =
    document.getElementById("quote-reference");

  const damageDetails =
    document.getElementById("damage-details");

  const unboundWarning =
    document.getElementById("unbound-warning");

  const ownershipWarning =
    document.getElementById("ownership-warning");


  /* ==========================================================
     7. WIZARD STATE
     ========================================================== */

  let currentStep = 0;


  /* ==========================================================
     8. ERROR MESSAGE
     ========================================================== */

  function error(message) {

    alert(message);

  }


  /* ==========================================================
     9. SHOW STEP
     ========================================================== */

  function showStep(index) {

    if (index < 0 || index >= steps.length) {
      return;
    }

    steps.forEach(function (step, i) {

      step.hidden = i !== index;

    });


    progressItems.forEach(function (item, i) {

      if (i === index) {

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
     10. RADIO HELPER
     ========================================================== */

  function selected(name) {

    return form.querySelector(
      'input[name="' + name + '"]:checked'
    );

  }


  /* ==========================================================
     11. MANUFACTURER
     ========================================================== */

  function validateManufacturer() {

    const manufacturer =
      selected("manufacturer");

    if (!manufacturer) {

      error(
        "Please select a manufacturer."
      );

      return false;

    }


    if (
      manufacturer.value.toLowerCase() !== "dji"
    ) {

      error(
        "This automatic quote system currently supports DJI drones."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     12. POPULATE MODELS
     ========================================================== */

  function populateModels() {

    if (!modelSelect) {
      return;
    }

    modelSelect.innerHTML = "";


    const placeholder =
      document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
      "-- Select your DJI model --";

    modelSelect.appendChild(
      placeholder
    );


    Object.keys(droneDatabase.dji)
      .forEach(function (id) {

        const model =
          droneDatabase.dji[id];

        const option =
          document.createElement("option");

        option.value = id;

        option.textContent =
          model.name;

        modelSelect.appendChild(
          option
        );

      });

  }


  /* ==========================================================
     13. MODEL VALIDATION
     ========================================================== */

  function validateModel() {

    if (!modelSelect || !modelSelect.value) {

      error(
        "Please select your DJI model."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     14. POPULATE PACKAGES
     ========================================================== */

  function populatePackages() {

    if (!packageSelect || !modelSelect) {
      return;
    }


    packageSelect.innerHTML = "";


    const placeholder =
      document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
      "-- Select your package --";

    packageSelect.appendChild(
      placeholder
    );


    const modelId =
      modelSelect.value;


    const packages =
      packageDatabase[modelId] ||
      defaultPackages;


    packages.forEach(function (pkg) {

      const option =
        document.createElement("option");

      option.value =
        pkg.id;

      option.textContent =
        pkg.name;

      packageSelect.appendChild(
        option
      );

    });

  }


  /* ==========================================================
     15. PACKAGE VALIDATION
     ========================================================== */

  function validatePackage() {

    if (
      !packageSelect ||
      !packageSelect.value
    ) {

      error(
        "Please select the exact package."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     16. CONDITION
     ========================================================== */

  function validateCondition() {

    if (!selected("condition")) {

      error(
        "Please select the condition of your drone."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     17. FLIGHT TIME
     ========================================================== */

  function getFlightRange() {

    const range =
      selected("flightHoursRange");

    if (range) {
      return range.value;
    }


    const input =
      document.getElementById(
        "flight-hours"
      );


    if (
      !input ||
      input.value === ""
    ) {

      return null;

    }


    const hours =
      Number(input.value);


    if (Number.isNaN(hours)) {
      return null;
    }


    if (hours <= 5) {
      return "0-5";
    }

    if (hours <= 20) {
      return "5-20";
    }

    if (hours <= 50) {
      return "20-50";
    }

    if (hours <= 100) {
      return "50-100";
    }

    if (hours <= 150) {
      return "100-150";
    }

    if (hours <= 200) {
      return "150-200";
    }

    return "200+";

  }


  function validateFlightTime() {

    const input =
      document.getElementById(
        "flight-hours"
      );

    const range =
      selected("flightHoursRange");


    if (
      (!input || input.value === "") &&
      !range
    ) {

      error(
        "Please enter the flight time or select a flight-time range."
      );

      return false;

    }


    if (
      input &&
      input.value !== ""
    ) {

      const hours =
        Number(input.value);


      if (
        Number.isNaN(hours) ||
        hours < 0
      ) {

        error(
          "Please enter a valid flight time."
        );

        return false;

      }

    }


    return true;

  }


  /* ==========================================================
     18. BATTERIES
     ========================================================== */

  let batteryCounter = 0;


  function createBatteryEntry() {

    if (!batteriesContainer) {
      return;
    }


    batteryCounter++;


    const wrapper =
      document.createElement("div");

    wrapper.className =
      "battery-entry";


    wrapper.innerHTML = `

      <div class="battery-field">

        <label for="battery-type-${batteryCounter}">
          Battery Type
        </label>

        <input
          type="text"
          id="battery-type-${batteryCounter}"
          class="battery-type"
          name="batteryType${batteryCounter}"
          placeholder="e.g. DJI Intelligent Flight Battery"
          required
        >

      </div>


      <div class="battery-field">

        <label for="battery-cycles-${batteryCounter}">
          Battery Cycle Count
        </label>

        <input
          type="number"
          id="battery-cycles-${batteryCounter}"
          class="battery-cycles"
          name="batteryCycles${batteryCounter}"
          min="0"
          step="1"
          placeholder="e.g. 12"
          required
        >

      </div>


      <button
        type="button"
        class="btn-remove-battery"
      >
        Remove Battery
      </button>

    `;


    batteriesContainer.appendChild(
      wrapper
    );

  }


  function validateBatteries() {

    if (!batteriesContainer) {

      error(
        "Battery information section could not be found."
      );

      return false;

    }


    const batteries =
      batteriesContainer.querySelectorAll(
        ".battery-entry"
      );


    if (batteries.length === 0) {

      error(
        "Please click Add Battery and enter the battery information."
      );

      return false;

    }


    for (
      const battery of batteries
    ) {

      const type =
        battery.querySelector(
          ".battery-type"
        );


      const cycles =
        battery.querySelector(
          ".battery-cycles"
        );


      if (
        !type ||
        !type.value.trim()
      ) {

        error(
          "Please enter the battery type."
        );

        if (type) {
          type.focus();
        }

        return false;

      }


      if (
        !cycles ||
        cycles.value === "" ||
        Number(cycles.value) < 0
      ) {

        error(
          "Please enter a valid battery cycle count."
        );

        if (cycles) {
          cycles.focus();
        }

        return false;

      }

    }


    return true;

  }


  function batteryCycleDeduction(
    cycles
  ) {

    const value =
      Number(cycles);


    if (
      Number.isNaN(value) ||
      value <= 20
    ) {

      return 0;

    }


    if (value <= 50) {

      return 10;

    }


    if (value <= 100) {

      return 25;

    }


    if (value <= 150) {

      return 50;

    }


    return 75;

  }


  /* ==========================================================
     19. UNBOUND
     ========================================================== */

  function validateUnbound() {

    const answer =
      selected("unbound");


    if (!answer) {

      error(
        "Please tell us whether the drone is unbound from your DJI account."
      );

      return false;

    }


    if (
      unboundWarning
    ) {

      unboundWarning.hidden =
        answer.value !== "no";

    }


    if (
      answer.value === "no"
    ) {

      error(
        "The aircraft normally needs to be unbound before a standard purchase can proceed. Please contact us for manual review."
      );

      return false;

    }


    if (
      answer.value === "unknown"
    ) {

      return true;

    }


    return true;

  }


  /* ==========================================================
     20. DAMAGE
     ========================================================== */

  function validateDamage() {

    const answer =
      selected("damage");


    if (!answer) {

      error(
        "Please tell us whether the drone has any damage."
      );

      return false;

    }


    if (
      answer.value === "yes"
    ) {

      const description =
        document.getElementById(
          "damage-description"
        );


      if (
        description &&
        !description.value.trim()
      ) {

        error(
          "Please describe the damage."
        );

        description.focus();

        return false;

      }

    }


    return true;

  }


  /* ==========================================================
     21. PACKAGE CONTENTS
     ========================================================== */

  function populatePackageContents() {

    if (
      !packageContentsList ||
      !packageSelect ||
      !modelSelect
    ) {

      return;

    }


    packageContentsList.innerHTML = "";


    const packages =
      packageDatabase[
        modelSelect.value
      ] ||
      defaultPackages;


    const pkg =
      packages.find(function (item) {

        return item.id ===
          packageSelect.value;

      });


    if (!pkg) {
      return;
    }


    pkg.contents.forEach(
      function (item, index) {

        const wrapper =
          document.createElement("div");

        wrapper.className =
          "package-content-item";


        wrapper.innerHTML = `

          <strong>${item}</strong>

          <div>

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

          </div>

        `;


        packageContentsList.appendChild(
          wrapper
        );

      }
    );

  }


  /* ==========================================================
     22. SERIAL NUMBERS
     ========================================================== */

  function validateSerialNumbers() {

    const serial =
      document.getElementById(
        "drone-serial-number"
      );


    if (
      !serial ||
      !serial.value.trim()
    ) {

      error(
        "Please enter the drone serial number."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     23. PHOTOS
     ========================================================== */

  function validatePhotos() {

    const input =
      document.getElementById(
        "photo-uploads"
      );


    if (
      !input ||
      !input.files ||
      input.files.length === 0
    ) {

      error(
        "Please upload at least one photograph."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     24. OWNERSHIP
     ========================================================== */

  function validateOwnership() {

    const el =
      selected("legalRight");


    if (!el) {

      error(
        "Please confirm whether you have the legal right to sell this equipment."
      );

      return false;

    }


    if (
      ownershipWarning
    ) {

      ownershipWarning.hidden =
        el.value === "yes";

    }


    if (
      el.value === "no" ||
      el.value === "not-sure"
    ) {

      error(
        "We cannot automatically purchase equipment where ownership is uncertain. Please contact us for a manual review."
      );

      return false;

    }


    return true;

  }


  /* ==========================================================
     25. CUSTOMER DETAILS
     ========================================================== */

  function validateCustomerDetails() {

    const ids = [

      "full-name",

      "email-address",

      "phone-number",

      "address-line-1",

      "city",

      "postcode"

    ];


    for (
      const id of ids
    ) {

      const el =
        document.getElementById(id);


      if (
        !el ||
        !el.value.trim()
      ) {

        error(
          "Please complete all required customer and return-address fields."
        );


        if (el) {
          el.focus();
        }


        return false;

      }

    }


    const email =
      document.getElementById(
        "email-address"
      );


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.value.trim()
      )
    ) {

      error(
        "Please enter a valid email address."
      );

      email.focus();

      return false;

    }


    const phone =
      document.getElementById(
        "phone-number"
      );


    const digits =
      phone.value.replace(
        /[^0-9+]/g,
        ""
      );


    if (
      digits.length < 7
    ) {

      error(
        "Please enter a valid telephone number."
      );

      phone.focus();

      return false;

    }


    const postcode =
      document.getElementById(
        "postcode"
      );


    if (
      !/^[A-Z0-9]{2,4}\s?[A-Z0-9]{3}$/i.test(
        postcode.value.trim()
      )
    ) {

      error(
        "Please enter a valid UK postcode."
      );

      postcode.focus();

      return false;

    }


    return validateOwnership();

  }


  /* ==========================================================
     26. CALCULATE QUOTE
     ========================================================== */

  function calculateQuote() {

    const modelId =
      modelSelect &&
      modelSelect.value;


    const packageId =
      packageSelect &&
      packageSelect.value;


    const model =
      droneDatabase.dji[
        modelId
      ];


    if (!model) {

      return {

        manual: true,

        reason:
          "Model not found."

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
      pricingDatabase[
        modelId
      ];


    if (!modelPricing) {

      return {

        manual: true,

        reason:
          "This model has not yet been given a verified automatic purchase price."

      };

    }


    const packagePricing =
      modelPricing.packages[
        packageId
      ];


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
      Number(
        packagePricing.basePrice
      );


    const floor =
      packagePricing.floorPrice == null
        ? 0
        : Number(
            packagePricing.floorPrice
          );


    const flightRange =
      getFlightRange();


    const flightDeduction =
      flightDeductions[
        flightRange
      ];


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
      typeof flightDeduction ===
      "number"
    ) {

      value -=
        flightDeduction;

    }


    const condition =
      selected("condition");


    if (condition) {

      value -=
        Number(
          conditionDeductions[
            condition.value
          ] || 0
        );

    }


    if (
      batteriesContainer
    ) {

      batteriesContainer
        .querySelectorAll(
          ".battery-entry"
        )
        .forEach(
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

    }


    if (
      value < floor
    ) {

      return {

        manual: true,

        reason:
          "The calculated value is below the automatic purchase floor."

      };

    }


    return {

      manual: false,

      value:
        Math.max(
          0,
          Math.round(value)
        )

    };

  }


  /* ==========================================================
     27. QUOTE REFERENCE
     ========================================================== */

  function generateQuoteReference() {

    const year =
      new Date().getFullYear();


    const random =
      Math.floor(
        100000 +
        Math.random() *
        900000
      );


    return (
      "WBA-" +
      year +
      "-" +
      random
    );

  }


  /* ==========================================================
     28. DISPLAY QUOTE
     ========================================================== */

  function displayQuote() {

    if (
      !quoteSummary ||
      !modelSelect ||
      !packageSelect
    ) {

      return;

    }


    const model =
      droneDatabase.dji[
        modelSelect.value
      ];


    const packages =
      packageDatabase[
        modelSelect.value
      ] ||
      defaultPackages;


    const pkg =
      packages.find(
        function (item) {

          return item.id ===
            packageSelect.value;

        }
      );


    const condition =
      selected("condition");


    const quote =
      calculateQuote();


    if (
      quote.manual
    ) {

      quoteSummary.innerHTML = `

        <div class="manual-valuation">

          <h4>
            MANUAL VALUATION REQUIRED
          </h4>

          <p>
            We need to manually assess this equipment before confirming a purchase price.
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

        <h4>
          YOUR INSTANT QUOTE
        </h4>

        <p>
          <strong>Model:</strong>
          ${model ? model.name : ""}
        </p>

        <p>
          <strong>Package:</strong>
          ${pkg ? pkg.name : ""}
        </p>

        <p>
          <strong>Condition:</strong>
          ${
            condition
              ? condition.parentElement.textContent.trim()
              : ""
          }
        </p>

        <div class="quote-price">
          £${quote.value.toLocaleString("en-GB")}
        </div>

        <p>
          Estimated purchase price
        </p>

      </div>

    `;

  }


  /* ==========================================================
     29. NEXT
     ========================================================== */

  function goNext() {

    switch (
      currentStep
    ) {


      case 0:

        if (
          !validateManufacturer()
        ) {
          return;
        }


        populateModels();

        showStep(1);

        break;



      case 1:

        if (
          !validateModel()
        ) {
          return;
        }


        populatePackages();

        showStep(2);

        break;



      case 2:

        if (
          !validatePackage()
        ) {
          return;
        }


        populatePackageContents();

        showStep(3);

        break;



      case 3:

        if (
          !validateCondition()
        ) {
          return;
        }


        showStep(4);

        break;



      case 4:

        if (
          !validateFlightTime()
        ) {
          return;
        }


        showStep(5);

        break;



      case 5:

        if (
          !validateBatteries()
        ) {
          return;
        }


        showStep(6);

        break;



      case 6:

        if (
          !validateUnbound()
        ) {
          return;
        }


        showStep(7);

        break;



      case 7:

        if (
          !validateDamage()
        ) {
          return;
        }


        showStep(8);

        break;



      case 8:

        showStep(9);

        break;



      case 9:

        if (
          !validateSerialNumbers()
        ) {
          return;
        }


        showStep(10);

        break;



      case 10:

        if (
          !validatePhotos()
        ) {
          return;
        }


        displayQuote();

        showStep(11);

        break;



      case 11:

        /*
          Quote result.

          The ACCEPT button handles progression
          to customer details.
        */

        break;



      case 12:

        if (
          !validateCustomerDetails()
        ) {
          return;
        }


        if (
          quoteReference
        ) {

          quoteReference.textContent =
            generateQuoteReference();

        }


        showStep(13);

        break;



      case 13:

        showStep(14);

        break;



      case 14:

        showStep(15);

        break;



      default:

        break;

    }

  }


  /* ==========================================================
     30. BACK
     ========================================================== */

  function goBack() {

    if (
      currentStep > 0
    ) {

      showStep(
        currentStep - 1
      );

    }

  }


  /* ==========================================================
     31. SINGLE EVENT HANDLER
     ========================================================== */

  /*
     IMPORTANT:

     There is deliberately ONE delegated click handler.

     This means dynamically-created battery buttons
     and normal Next/Back buttons all use the same
     event system.

     This prevents the previous problem where Step 6
     buttons were not responding.
  */

  form.addEventListener(
    "click",
    function (event) {

      const target =
        event.target.closest(
          "button"
        );


      if (
        !target ||
        !form.contains(target)
      ) {

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


        const entry =
          target.closest(
            ".battery-entry"
          );


        if (entry) {
          entry.remove();
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

        goBack();

        return;

      }


      /* ACCEPT INSTANT QUOTE */

      if (
        target.classList.contains(
          "btn-accept"
        )
      ) {

        event.preventDefault();

        showStep(12);

        return;

      }


      /* SUBMIT CUSTOMER DETAILS */

      if (
        target.classList.contains(
          "btn-submit"
        )
      ) {

        event.preventDefault();


        if (
          !validateCustomerDetails()
        ) {

          return;

        }


        if (
          quoteReference
        ) {

          quoteReference.textContent =
            generateQuoteReference();

        }


        showStep(13);

        return;

      }


      /* NEXT */

      if (
        target.classList.contains(
          "btn-next"
        )
      ) {

        event.preventDefault();

        goNext();

      }

    }
  );


  /* ==========================================================
     32. MODEL CHANGE
     ========================================================== */

  if (
    modelSelect
  ) {

    modelSelect.addEventListener(
      "change",
      function () {

        populatePackages();


        if (
          packageContentsList
        ) {

          packageContentsList.innerHTML =
            "";

        }

      }
    );

  }


  /* ==========================================================
     33. PACKAGE CHANGE
     ========================================================== */

  if (
    packageSelect
  ) {

    packageSelect.addEventListener(
      "change",
      function () {

        populatePackageContents();

      }
    );

  }


  /* ==========================================================
     34. UNBOUND CHANGE
     ========================================================== */

  form
    .querySelectorAll(
      'input[name="unbound"]'
    )
    .forEach(
      function (input) {

        input.addEventListener(
          "change",
          function () {

            if (
              unboundWarning
            ) {

              unboundWarning.hidden =
                input.value !== "no" ||
                !input.checked;

            }

          }
        );

      }
    );


  /* ==========================================================
     35. DAMAGE CHANGE
     ========================================================== */

  form
    .querySelectorAll(
      'input[name="damage"]'
    )
    .forEach(
      function (input) {

        input.addEventListener(
          "change",
          function () {

            if (
              damageDetails
            ) {

              damageDetails.hidden =
                input.value !== "yes" ||
                !input.checked;

            }

          }
        );

      }
    );


  /* ==========================================================
     36. INITIALISE
     ========================================================== */

  /*
     IMPORTANT:

     Do NOT create a battery automatically.

     The customer must explicitly click
     ADD BATTERY on Step 6.
  */

  showStep(0);


  console.log(
    "WE BUY ANY DRONE quote wizard loaded successfully."
  );

});
