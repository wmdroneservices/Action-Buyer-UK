/* ============================================================
   WE BUY ANY DRONE
   Complete Instant Quote Wizard
   Replace the ENTIRE contents of quote.js with this file.
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

  "use strict";

  /* ============================================================
     BASIC DOM SETUP
     ============================================================ */

  const form = document.getElementById("quote-form");

  if (!form) {
    console.error("WE BUY ANY DRONE: quote-form was not found.");
    return;
  }

  const progressList = document.getElementById("progress-indicator");

  let steps = [];
  let currentStep = 0;

  function refreshSteps() {
    steps = Array.from(form.querySelectorAll(".wizard-step"));
  }

  refreshSteps();


  /* ============================================================
     DATA
     ============================================================ */

  const manufacturers = [
    {
      id: "dji",
      name: "DJI"
    }
  ];


  const djiModels = {

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


  /* ============================================================
     PACKAGE DATABASE
     ============================================================ */

  const packageOptions = {

    "mini-5-pro": {
      "drone-only": "Drone only",
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2",
      "fly-more-plus-rc-2": "Fly More Combo Plus + RC 2"
    },

    "mini-4-pro": {
      "drone-only": "Drone only",
      "standard-rc-n2": "Standard + RC-N2",
      "standard-rc-2": "Standard + RC 2",
      "fly-more-rc-n2": "Fly More Combo + RC-N2",
      "fly-more-rc-2": "Fly More Combo + RC 2"
    },

    "mini-3-pro": {
      "drone-only": "Drone only",
      "drone-rc-n1": "Drone + RC-N1",
      "drone-dji-rc": "Drone + DJI RC",
      "fly-more-rc-n1": "Fly More Combo + RC-N1",
      "fly-more-dji-rc": "Fly More Combo + DJI RC"
    },

    "mini-3": {
      "drone-only": "Drone only",
      "standard-rc-n1": "Standard + RC-N1",
      "fly-more-rc-n1": "Fly More Combo + RC-N1"
    },

    "mini-2": {
      "drone-only": "Drone only",
      "standard-rc-n1": "Standard + RC-N1",
      "fly-more": "Fly More Combo"
    },

    "neo": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "neo-2": {
      "standard": "Standard Package",
      "fly-more": "Fly More Combo"
    },

    "flip": {
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2"
    },

    "air": {
      "drone-only": "Drone only",
      "standard": "Standard Package",
      "fly-more": "Fly More Combo"
    },

    "air-2": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "air-2s": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "air-3": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "air-3s": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "mavic-2-pro": {
      "drone-only": "Drone only",
      "standard": "Standard Package",
      "fly-more": "Fly More Combo"
    },

    "mavic-2-zoom": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "mavic-3": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "mavic-3-classic": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "mavic-3-pro": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "mavic-3-pro-cine": {
      "drone-only": "Drone only",
      "premium-combo": "Premium Combo"
    },

    "mavic-4-pro": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    },

    "fpv": {
      "drone-only": "Drone only",
      "fly-smart": "Fly Smart Combo"
    },

    "avata": {
      "drone-only": "Drone only",
      "fly-smart": "Fly Smart Combo",
      "pro-view": "Pro-View Combo",
      "explorer": "Explorer Combo"
    },

    "avata-2": {
      "drone-only": "Drone only",
      "fly-more": "Fly More Combo"
    }

  };


  /* ============================================================
     PRICING DATABASE
     
     IMPORTANT:
     £500 is currently the verified test/base purchase price
     for:
     
     DJI Mini 5 Pro
     Fly More Combo + RC 2
     
     Other models/packages remain manual valuation until prices
     are entered here.
     ============================================================ */

  const pricing = {

    "mini-5-pro": {

      "fly-more-rc-2": {

        basePrice: 500,

        floorPrice: 250,

        flightDeductions: {
          "0-5": 0,
          "5-20": 0,
          "20-50": 25,
          "50-100": 50,
          "100-150": 100,
          "150-200": 150,
          "200+": null
        },

        conditionRules: {
          "factory-sealed": 0,
          "opened-unused": 0,
          "excellent": 0,
          "good": 25,
          "fair": 75,
          "damaged": 150,
          "not-working": null
        },

        batteryRules: {
          "0-50": 0,
          "51-100": 5,
          "101-200": 15,
          "201-300": 30,
          "301+": 50
        },

        missingItems: {
          "drone": 500,
          "controller": 100,
          "battery": 50,
          "charging-hub": 25,
          "bag": 20,
          "propellers": 10,
          "power-supply": 20,
          "cables": 10
        },

        extras: {
          "battery": 30,
          "charging-hub": 20,
          "controller": 50
        }

      }

    }

  };


  /* ============================================================
     CUSTOMER DATA
     ============================================================ */

  const quoteData = {

    manufacturer: "",
    model: "",
    package: "",
    condition: "",
    flightHours: "",
    flightHoursRange: "",
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
    postcode: "",
    bankName: "",
    accountNumber: "",
    sortCode: "",
    quoteAmount: null,
    quoteReference: ""

  };


  /* ============================================================
     UTILITY FUNCTIONS
     ============================================================ */

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getAllModels() {

    const result = [];

    Object.keys(djiModels).forEach(function (category) {

      djiModels[category].forEach(function (model) {

        result.push(model);

      });

    });

    return result;

  }


  function getModelName(id) {

    const model = getAllModels().find(function (item) {

      return item.id === id;

    });

    return model ? model.name : id;

  }


  function getPackageName(modelId, packageId) {

    if (
      packageOptions[modelId] &&
      packageOptions[modelId][packageId]
    ) {

      return packageOptions[modelId][packageId];

    }

    return packageId || "Package";

  }


  function formatMoney(amount) {

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(amount);

  }


  function getFlightRange(hours) {

    const h = Number(hours);

    if (isNaN(h)) return "";

    if (h <= 5) return "0-5";
    if (h <= 20) return "5-20";
    if (h <= 50) return "20-50";
    if (h <= 100) return "50-100";
    if (h <= 150) return "100-150";
    if (h <= 200) return "150-200";

    return "200+";

  }


  function generateQuoteReference() {

    const year = new Date().getFullYear();

    const random = Math.floor(
      100000 + Math.random() * 900000
    );

    return "WBA-" + year + "-" + random;

  }


  /* ============================================================
     CREATE MISSING WIZARD STEPS
     
     Your current quote.html only contains Steps 1-6.
     This function creates Steps 7-16 if they are missing.
     ============================================================ */

  function ensureLaterStepsExist() {

    refreshSteps();

    const existingSteps = new Set(
      steps.map(function (step) {
        return Number(step.dataset.step);
      })
    );

    if (!existingSteps.has(7)) {
      createStep7();
    }

    refreshSteps();

    if (!existingSteps.has(8)) {
      createStep8();
    }

    refreshSteps();

    if (!existingSteps.has(9)) {
      createStep9();
    }

    refreshSteps();

    if (!existingSteps.has(10)) {
      createStep10();
    }

    refreshSteps();

    if (!existingSteps.has(11)) {
      createStep11();
    }

    refreshSteps();

    if (!existingSteps.has(12)) {
      createStep12();
    }

    refreshSteps();

    if (!existingSteps.has(13)) {
      createStep13();
    }

    refreshSteps();

    if (!existingSteps.has(14)) {
      createStep14();
    }

    refreshSteps();

    if (!existingSteps.has(15)) {
      createStep15();
    }

    refreshSteps();

    if (!existingSteps.has(16)) {
      createStep16();
    }

    refreshSteps();

  }


  function createWizardSection(number, html) {

    const section = document.createElement("section");

    section.className = "wizard-step";

    section.dataset.step = String(number);

    section.hidden = true;

    section.innerHTML = html;

    form.appendChild(section);

    return section;

  }


  function navigationHTML(backText, nextText) {

    return `
      <div class="navigation-buttons">
        <button type="button" class="btn-back">
          ${escapeHTML(backText || "Back")}
        </button>
        <button type="button" class="btn-next">
          ${escapeHTML(nextText || "Next")}
        </button>
      </div>
    `;

  }


  function createStep7() {

    createWizardSection(7, `
      <h3>Step 7: Unbound Status</h3>

      <p>
        Is the drone unbound from your DJI account?
      </p>

      <fieldset>
        <legend>DJI account status</legend>

        <label>
          <input type="radio" name="unbound" value="yes">
          Yes
        </label>

        <label>
          <input type="radio" name="unbound" value="no">
          No
        </label>

        <label>
          <input type="radio" name="unbound" value="unknown">
          I Don't Know
        </label>
      </fieldset>

      <p>
        Please provide a screenshot or photograph showing the aircraft
        is unbound where possible.
      </p>

      ${navigationHTML()}
    `);

  }


  function createStep8() {

    createWizardSection(8, `
      <h3>Step 8: Damage</h3>

      <p>Does the drone have any damage?</p>

      <fieldset>
        <legend>Damage status</legend>

        <label>
          <input type="radio" name="damage" value="no">
          No
        </label>

        <label>
          <input type="radio" name="damage" value="yes">
          Yes
        </label>
      </fieldset>

      <div id="damage-details" hidden>

        <label for="damage-description">
          Description of damage
        </label>

        <textarea
          id="damage-description"
          name="damageDescription"
          rows="5"
          placeholder="Please describe all damage."
        ></textarea>

        <p>
          Examples: cracked body, damaged arm, damaged gimbal,
          damaged camera, scratches, propeller damage, landing damage,
          water damage or other faults.
        </p>

        <label for="damage-photos">
          Damage photographs
        </label>

        <input
          type="file"
          id="damage-photos"
          accept="image/*"
          multiple
        >

      </div>

      ${navigationHTML()}
    `);

  }


  function createStep9() {

    createWizardSection(9, `
      <h3>Step 9: Package Contents</h3>

      <p>
        Please confirm what is present, missing or additional.
      </p>

      <div id="package-contents-list"></div>

      ${navigationHTML()}
    `);

  }


  function createStep10() {

    createWizardSection(10, `
      <h3>Step 10: Serial Numbers</h3>

      <label for="drone-serial-number">
        Drone Serial Number
      </label>

      <input
        type="text"
        id="drone-serial-number"
        name="droneSerial"
        maxlength="50"
        required
      >

      <label for="controller-serial-number">
        Controller Serial Number
      </label>

      <input
        type="text"
        id="controller-serial-number"
        name="controllerSerial"
        maxlength="50"
      >

      <p>
        Serial numbers may be checked during inspection and
        ownership verification.
      </p>

      ${navigationHTML()}
    `);

  }


  function createStep11() {

    createWizardSection(11, `
      <h3>Step 11: Photographs</h3>

      <p>
        Upload clear photographs to help us verify your equipment.
      </p>

      <ul>
        <li>Drone</li>
        <li>Controller</li>
        <li>Package contents</li>
        <li>Flight-time information</li>
        <li>Battery-cycle information</li>
        <li>Unbound status</li>
        <li>Damage where applicable</li>
        <li>Serial numbers where possible</li>
      </ul>

      <label for="photo-uploads">
        Upload photographs
      </label>

      <input
        type="file"
        id="photo-uploads"
        name="photos"
        accept="image/*"
        multiple
        required
      >

      ${navigationHTML()}
    `);

  }


  function createStep12() {

    createWizardSection(12, `
      <h3>Your Instant Quote</h3>

      <div id="quote-summary"></div>

      <div class="quote-important">
        <h4>IMPORTANT</h4>

        <p>
          Your Instant Quote is based on the information and
          photographs you have provided.
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
          or other information differs materially, we may make
          a revised final offer.
        </p>

        <p>
          If you do not accept a revised offer, we will return
          the equipment to the full address you provide.
        </p>
      </div>

      <div class="navigation-buttons">

        <button type="button" class="btn-back">
          Back
        </button>

        <button type="button" class="btn-accept">
          Accept Instant Quote &amp; Continue
        </button>

      </div>
    `);

  }


  function createStep13() {

    createWizardSection(13, `
      <h3>Step 13: Your Details</h3>

      <p>
        We require your full return address because your equipment
        is physically inspected after receipt. If you reject a
        revised final valuation, we need to be able to return
        your equipment to you.
      </p>

      <label for="full-name">
        Full Name
      </label>

      <input
        type="text"
        id="full-name"
        name="fullName"
        required
      >

      <label for="email-address">
        Email Address
      </label>

      <input
        type="email"
        id="email-address"
        name="email"
        required
      >

      <label for="phone-number">
        Telephone Number
      </label>

      <input
        type="tel"
        id="phone-number"
        name="phone"
        required
      >

      <fieldset>
        <legend>Full Return Address</legend>

        <label for="address-line-1">
          Address Line 1
        </label>

        <input
          type="text"
          id="address-line-1"
          name="addressLine1"
          required
        >

        <label for="address-line-2">
          Address Line 2
        </label>

        <input
          type="text"
          id="address-line-2"
          name="addressLine2"
        >

        <label for="city">
          Town / City
        </label>

        <input
          type="text"
          id="city"
          name="city"
          required
        >

        <label for="county">
          County
        </label>

        <input
          type="text"
          id="county"
          name="county"
          required
        >

        <label for="postcode">
          Postcode
        </label>

        <input
          type="text"
          id="postcode"
          name="postcode"
          required
        >

      </fieldset>

      <fieldset>
        <legend>
          Do you have the legal right to sell this equipment?
        </legend>

        <label>
          <input
            type="radio"
            name="legalRight"
            value="yes"
            required
          >
          Yes
        </label>

        <label>
          <input
            type="radio"
            name="legalRight"
            value="no"
          >
          No
        </label>

        <label>
          <input
            type="radio"
            name="legalRight"
            value="not-sure"
          >
          I'm not sure
        </label>

      </fieldset>

      <div class="navigation-buttons">

        <button type="button" class="btn-back">
          Back
        </button>

        <button type="button" class="btn-next">
          Submit Quote
        </button>

      </div>
    `);

  }


  function createStep14() {

    createWizardSection(14, `
      <h3>Quote Submitted</h3>

      <p>
        Your quote reference:
      </p>

      <p
        id="quote-reference"
        class="quote-ref"
      ></p>

      <p>
        Your quote information has been recorded on this device
        for this prototype.
      </p>

      <p>
        <strong>
          BACKEND INTEGRATION REQUIRED
        </strong>
      </p>

      <p>
        A production version will send the confirmation directly
        to the business system and customer email address.
      </p>

      <div class="navigation-buttons">

        <button type="button" class="btn-next">
          Continue to Shipping Instructions
        </button>

      </div>
    `);

  }


  function createStep15() {

    createWizardSection(15, `
      <h3>Shipping Instructions</h3>

      <h4>Shipping Label</h4>

      <p>
        Your shipping label and instructions will be sent directly
        to the email address you supplied.
      </p>

      <p>
        <strong>
          BACKEND / SHIPPING PROVIDER INTEGRATION REQUIRED
        </strong>
      </p>

      <p>
        The live version can connect to Royal Mail or another
        approved courier to generate the shipping label.
      </p>

      <p>
        Do not send the equipment until you have received the
        shipping instructions.
      </p>

      ${navigationHTML("Back", "Continue")}
    `);

  }


  function createStep16() {

    createWizardSection(16, `
      <h3>Step 16: Final Inspection</h3>

      <p>
        When your equipment arrives, we will inspect:
      </p>

      <ol>
        <li>Model</li>
        <li>Serial number</li>
        <li>Flight time</li>
        <li>Battery cycles</li>
        <li>Condition</li>
        <li>Damage</li>
        <li>Package contents</li>
        <li>Unbound status</li>
        <li>Final valuation</li>
      </ol>

      <h3>Final Offer</h3>

      <p>
        After inspection you will receive a final offer.
      </p>

      <p>
        You can accept or decline the final offer.
      </p>

      <div class="navigation-buttons">

        <button type="button" class="btn-final-accept">
          Accept Final Offer
        </button>

        <button type="button" class="btn-final-decline">
          Decline Final Offer
        </button>

      </div>

      <div
        id="final-offer-result"
        hidden
      ></div>
    `);

  }


  /* ============================================================
     STEP DISPLAY
     ============================================================ */

  function showStep(index) {

    refreshSteps();

    if (index < 0 || index >= steps.length) {
      return;
    }

    steps.forEach(function (step, i) {

      step.hidden = i !== index;

    });

    currentStep = index;

    updateProgress();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (Number(steps[index].dataset.step) === 9) {
      populatePackageContents();
    }

    if (Number(steps[index].dataset.step) === 12) {
      renderQuoteSummary();
    }

  }


  function updateProgress() {

    if (!progressList) {
      return;
    }

    const items = progressList.querySelectorAll(".progress-step");

    items.forEach(function (item, index) {

      item.removeAttribute("aria-current");

      if (index === currentStep) {
        item.setAttribute("aria-current", "step");
      }

    });

  }


  /* ============================================================
     STEP 1
     ============================================================ */

  function validateManufacturer() {

    const selected = form.querySelector(
      'input[name="manufacturer"]:checked'
    );

    if (!selected) {

      alert("Please select a manufacturer.");

      return false;

    }

    quoteData.manufacturer = selected.value;

    return true;

  }


  /* ============================================================
     STEP 2
     ============================================================ */

  function populateDjiModels() {

    const select = document.getElementById("dji-model");

    if (!select) {
      return;
    }

    select.innerHTML =
      '<option value="">-- Select a DJI model --</option>';

    getAllModels().forEach(function (model) {

      const option = document.createElement("option");

      option.value = model.id;

      option.textContent = model.name;

      select.appendChild(option);

    });

    if (quoteData.model) {
      select.value = quoteData.model;
    }

  }


  function validateModel() {

    const select = document.getElementById("dji-model");

    if (!select || !select.value) {

      alert("Please select your DJI model.");

      return false;

    }

    quoteData.model = select.value;

    return true;

  }


  /* ============================================================
     STEP 3
     ============================================================ */

  function populatePackages() {

    const modelSelect = document.getElementById("dji-model");

    const packageSelect =
      document.getElementById("package-select");

    if (!packageSelect) {
      return;
    }

    const modelId =
      modelSelect ? modelSelect.value : quoteData.model;

    packageSelect.innerHTML =
      '<option value="">-- Select package --</option>';

    const packages =
      packageOptions[modelId] || {
        standard: "Standard Package"
      };

    Object.entries(packages).forEach(function ([id, name]) {

      const option = document.createElement("option");

      option.value = id;

      option.textContent = name;

      packageSelect.appendChild(option);

    });

    if (quoteData.package) {
      packageSelect.value = quoteData.package;
    }

  }


  function validatePackage() {

    const select =
      document.getElementById("package-select");

    if (!select || !select.value) {

      alert("Please select the exact package.");

      return false;

    }

    quoteData.package = select.value;

    return true;

  }


  /* ============================================================
     STEP 4
     ============================================================ */

  function validateCondition() {

    const selected =
      form.querySelector(
        'input[name="condition"]:checked'
      );

    if (!selected) {

      alert("Please select the condition of the drone.");

      return false;

    }

    quoteData.condition = selected.value;

    return true;

  }


  /* ============================================================
     STEP 5
     ============================================================ */

  function validateFlightTime() {

    const numberInput =
      document.getElementById("flight-hours");

    const range =
      form.querySelector(
        'input[name="flightHoursRange"]:checked'
      );

    const numberValue =
      numberInput ? numberInput.value.trim() : "";

    if (!numberValue && !range) {

      alert(
        "Please enter the flight hours or select a flight-time range."
      );

      return false;

    }

    if (numberValue) {

      const number =
        Number(numberValue);

      if (
        isNaN(number) ||
        number < 0
      ) {

        alert(
          "Please enter a valid flight-hour figure."
        );

        return false;

      }

      quoteData.flightHours = number;

      quoteData.flightHoursRange =
        getFlightRange(number);

    } else {

      quoteData.flightHoursRange =
        range.value;

      quoteData.flightHours = "";

    }

    return true;

  }


  /* ============================================================
     STEP 6 - BATTERIES
     ============================================================ */

  let batteryCount = 0;

  function getBatteryContainer() {

    let container =
      document.getElementById("batteries-container");

    if (!container) {

      const step6 =
        steps.find(function (step) {
          return Number(step.dataset.step) === 6;
        });

      if (!step6) {
        return null;
      }

      container =
        document.createElement("div");

      container.id =
        "batteries-container";

      step6.prepend(container);

    }

    return container;

  }


  function createBatteryEntry() {

    const container =
      getBatteryContainer();

    if (!container) {
      return;
    }

    batteryCount++;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "battery-entry";

    wrapper.style.border =
      "1px solid #ccc";

    wrapper.style.padding =
      "15px";

    wrapper.style.marginBottom =
      "12px";

    wrapper.style.borderRadius =
      "6px";

    wrapper.innerHTML = `

      <h4>Battery ${batteryCount}</h4>

      <label for="battery-type-${batteryCount}">
        Battery Type
      </label>

      <input
        type="text"
        id="battery-type-${batteryCount}"
        name="batteryType-${batteryCount}"
        placeholder="Example: Intelligent Flight Battery"
      >

      <label for="battery-cycles-${batteryCount}">
        Battery Cycle Count
      </label>

      <input
        type="number"
        id="battery-cycles-${batteryCount}"
        name="batteryCycles-${batteryCount}"
        min="0"
        step="1"
        placeholder="0"
      >

      <button
        type="button"
        class="btn-remove-battery"
      >
        Remove Battery
      </button>

    `;

    container.appendChild(wrapper);

    const removeButton =
      wrapper.querySelector(
        ".btn-remove-battery"
      );

    removeButton.addEventListener(
      "click",
      function () {

        wrapper.remove();

      }
    );

  }


  function ensureBatteryStep() {

    const container =
      getBatteryContainer();

    if (!container) {
      return;
    }

    if (
      container.querySelectorAll(
        ".battery-entry"
      ).length === 0
    ) {

      createBatteryEntry();

    }

    const step6 =
      steps.find(function (step) {
        return Number(step.dataset.step) === 6;
      });

    if (!step6) {
      return;
    }

    if (
      !step6.querySelector(
        "#battery-cycle-photo"
      )
    ) {

      const label =
        document.createElement("label");

      label.setAttribute(
        "for",
        "battery-cycle-photo"
      );

      label.textContent =
        "Battery cycle photograph / screenshot";

      const input =
        document.createElement("input");

      input.type = "file";

      input.id =
        "battery-cycle-photo";

      input.accept =
        "image/*";

      input.multiple =
        true;

      step6.insertBefore(
        input,
        step6.querySelector(
          ".navigation-buttons"
        )
      );

      step6.insertBefore(
        label,
        input
      );

    }

  }


  function validateBatteries() {

    const container =
      getBatteryContainer();

    if (!container) {

      alert(
        "Battery section could not be found."
      );

      return false;

    }

    const batteries =
      container.querySelectorAll(
        ".battery-entry"
      );

    if (batteries.length === 0) {

      alert(
        "Please add at least one battery."
      );

      return false;

    }

    const collected = [];

    for (const battery of batteries) {

      const typeInput =
        battery.querySelector(
          'input[name^="batteryType"]'
        );

      const cycleInput =
        battery.querySelector(
          'input[name^="batteryCycles"]'
        );

      const type =
        typeInput
          ? typeInput.value.trim()
          : "";

      const cycles =
        cycleInput
          ? cycleInput.value.trim()
          : "";

      if (!type) {

        alert(
          "Please enter the battery type."
        );

        return false;

      }

      if (
        cycles === "" ||
        isNaN(cycles) ||
        Number(cycles) < 0
      ) {

        alert(
          "Please enter a valid battery cycle count."
        );

        return false;

      }

      collected.push({
        type: type,
        cycles: Number(cycles)
      });

    }

    quoteData.batteries =
      collected;

    return true;

  }


  /* ============================================================
     STEP 7
     ============================================================ */

  function validateUnbound() {

    const selected =
      form.querySelector(
        'input[name="unbound"]:checked'
      );

    if (!selected) {

      alert(
        "Please tell us whether the drone is unbound."
      );

      return false;

    }

    quoteData.unbound =
      selected.value;

    if (selected.value === "no") {

      alert(
        "The aircraft normally needs to be unbound before a standard purchase can proceed. Your submission can still be reviewed manually."
      );

    }

    return true;

  }


  /* ============================================================
     STEP 8
     ============================================================ */

  function validateDamage() {

    const selected =
      form.querySelector(
        'input[name="damage"]:checked'
      );

    if (!selected) {

      alert(
        "Please tell us whether the drone has damage."
      );

      return false;

    }

    quoteData.damage =
      selected.value;

    const description =
      document.getElementById(
        "damage-description"
      );

    if (
      selected.value === "yes" &&
      description
    ) {

      quoteData.damageDescription =
        description.value.trim();

    }

    return true;

  }


  function setupDamageControls() {

    const radios =
      form.querySelectorAll(
        'input[name="damage"]'
      );

    radios.forEach(function (radio) {

      radio.addEventListener(
        "change",
        function () {

          const details =
            document.getElementById(
              "damage-details"
            );

          if (!details) {
            return;
          }

          details.hidden =
            radio.value !== "yes" ||
            !radio.checked;

        }
      );

    });

  }


  /* ============================================================
     STEP 9
     ============================================================ */

  function populatePackageContents() {

    const container =
      document.getElementById(
        "package-contents-list"
      );

    if (!container) {
      return;
    }

    if (container.dataset.populated === "true") {
      return;
    }

    container.innerHTML = "";

    const items = [
      {
        id: "drone",
        name: "Drone"
      },
      {
        id: "controller",
        name: "Controller"
      },
      {
        id: "battery",
        name: "Battery"
      },
      {
        id: "charging-hub",
        name: "Charging Hub"
      },
      {
        id: "bag",
        name: "Bag / Carry Case"
      },
      {
        id: "propellers",
        name: "Propellers"
      },
      {
        id: "power-supply",
        name: "Power Supply"
      },
      {
        id: "cables",
        name: "Cables"
      }
    ];

    items.forEach(function (item) {

      const row =
        document.createElement("div");

      row.style.marginBottom =
        "10px";

      row.innerHTML = `

        <label for="contents-${item.id}">
          ${escapeHTML(item.name)}
        </label>

        <select
          id="contents-${item.id}"
          data-content-id="${item.id}"
          class="package-content-select"
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

      `;

      container.appendChild(row);

    });

    container.dataset.populated =
      "true";

  }


  function validatePackageContents() {

    const selects =
      document.querySelectorAll(
        ".package-content-select"
      );

    if (selects.length === 0) {
      return true;
    }

    const contents = {};

    for (const select of selects) {

      if (!select.value) {

        alert(
          "Please mark each package item as Present, Missing or Additional."
        );

        return false;

      }

      contents[
        select.dataset.contentId
      ] = select.value;

    }

    quoteData.packageContents =
      contents;

    return true;

  }


  /* ============================================================
     STEP 10
     ============================================================ */

  function validateSerialNumbers() {

    const drone =
      document.getElementById(
        "drone-serial-number"
      );

    const controller =
      document.getElementById(
        "controller-serial-number"
      );

    if (
      !drone ||
      !drone.value.trim()
    ) {

      alert(
        "Please enter the drone serial number."
      );

      return false;

    }

    quoteData.droneSerial =
      drone.value.trim();

    quoteData.controllerSerial =
      controller
        ? controller.value.trim()
        : "";

    return true;

  }


  /* ============================================================
     STEP 11
     ============================================================ */

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

      alert(
        "Please upload at least one photograph. Clear photographs of the drone, controller, package contents and verification information are required."
      );

      return false;

    }

    quoteData.photos =
      Array.from(input.files);

    return true;

  }


  /* ============================================================
     PRICING
     ============================================================ */

  function calculateBatteryDeduction(
    packagePricing
  ) {

    if (
      !packagePricing ||
      !packagePricing.batteryRules
    ) {

      return 0;

    }

    let deduction = 0;

    quoteData.batteries.forEach(
      function (battery) {

        const cycles =
          Number(battery.cycles);

        if (cycles <= 50) {
          return;
        }

        if (cycles <= 100) {
          deduction +=
            packagePricing.batteryRules["51-100"] || 0;

        } else if (cycles <= 200) {
          deduction +=
            packagePricing.batteryRules["101-200"] || 0;

        } else if (cycles <= 300) {
          deduction +=
            packagePricing.batteryRules["201-300"] || 0;

        } else {
          deduction +=
            packagePricing.batteryRules["301+"] || 0;
        }

      }
    );

    return deduction;

  }


  function calculateMissingItemDeduction(
    packagePricing
  ) {

    if (
      !packagePricing ||
      !packagePricing.missingItems
    ) {

      return 0;

    }

    let deduction = 0;

    Object.entries(
      quoteData.packageContents
    ).forEach(
      function ([item, status]) {

        if (status === "missing") {

          deduction +=
            packagePricing.missingItems[item] || 0;

        }

      }
    );

    return deduction;

  }


  function calculateExtraValue(
    packagePricing
  ) {

    if (
      !packagePricing ||
      !packagePricing.extras
    ) {

      return 0;

    }

    let value = 0;

    Object.entries(
      quoteData.packageContents
    ).forEach(
      function ([item, status]) {

        if (status === "additional") {

          value +=
            packagePricing.extras[item] || 0;

        }

      }
    );

    return value;

  }


  function calculateInstantQuote() {

    const model =
      quoteData.model;

    const packageId =
      quoteData.package;

    if (!model || !packageId) {

      return {
        status: "manual",
        amount: null,
        reason:
          "A model or package has not been selected."
      };

    }

    const modelPricing =
      pricing[model];

    if (!modelPricing) {

      return {
        status: "manual",
        amount: null,
        reason:
          "This model has not yet been given a verified automatic purchase price."
      };

    }

    const packagePricing =
      modelPricing[packageId];

    if (!packagePricing) {

      return {
        status: "manual",
        amount: null,
        reason:
          "A verified purchase price has not yet been entered for this package."
      };

    }

    if (
      packagePricing.basePrice === 0
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "A verified purchase price has not yet been entered for this package."
      };

    }

    let price =
      Number(packagePricing.basePrice);

    /* Flight deduction */

    let flightRange =
      quoteData.flightHoursRange;

    if (
      quoteData.flightHours !== "" &&
      quoteData.flightHours !== null
    ) {

      flightRange =
        getFlightRange(
          quoteData.flightHours
        );

    }

    if (
      flightRange === "200+" &&
      packagePricing.flightDeductions &&
      packagePricing.flightDeductions["200+"] === null
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "Very high flight time requires manual valuation."
      };

    }

    const flightDeduction =
      packagePricing.flightDeductions &&
      packagePricing.flightDeductions[flightRange]
        ? packagePricing.flightDeductions[flightRange]
        : 0;

    price -=
      flightDeduction;

    /* Battery deduction */

    price -=
      calculateBatteryDeduction(
        packagePricing
      );

    /* Condition deduction */

    if (
      packagePricing.conditionRules &&
      Object.prototype.hasOwnProperty.call(
        packagePricing.conditionRules,
        quoteData.condition
      )
    ) {

      const conditionDeduction =
        packagePricing.conditionRules[
          quoteData.condition
        ];

      if (conditionDeduction === null) {

        return {
          status: "manual",
          amount: null,
          reason:
            "This condition requires manual valuation."
        };

      }

      price -=
        conditionDeduction;

    }

    /* Missing items */

    price -=
      calculateMissingItemDeduction(
        packagePricing
      );

    /* Extras */

    const extrasValue =
      calculateExtraValue(
        packagePricing
      );

    /*
      Do not allow extras to push the automatic quote
      above the package base price.
    */

    price +=
      extrasValue;

    if (
      price >
      packagePricing.basePrice
    ) {

      price =
        packagePricing.basePrice;

    }

    /* Damaged / non-working route */

    if (
      quoteData.condition === "not-working"
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "Non-working / spares-only equipment requires manual parts valuation."
      };

    }

    if (
      quoteData.condition === "damaged"
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "Damaged equipment requires manual damage valuation."
      };

    }

    /* Ownership */

    if (
      quoteData.legalRight === "no" ||
      quoteData.legalRight === "not-sure"
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "Ownership must be confirmed before an automatic purchase quote can be provided."
      };

    }

    /* Unbound */

    if (
      quoteData.unbound === "no" ||
      quoteData.unbound === "unknown"
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "The drone's DJI account status requires manual review."
      };

    }

    /* Floor price */

    if (
      typeof packagePricing.floorPrice === "number" &&
      price <
      packagePricing.floorPrice
    ) {

      return {
        status: "manual",
        amount: null,
        reason:
          "The calculated value is below the automatic purchase floor."
      };

    }

    return {
      status: "automatic",
      amount:
        Math.round(price * 100) / 100,
      basePrice:
        packagePricing.basePrice,
      flightDeduction:
        flightDeduction,
      batteryDeduction:
        calculateBatteryDeduction(
          packagePricing
        ),
      conditionDeduction:
        packagePricing.conditionRules &&
        packagePricing.conditionRules[
          quoteData.condition
        ]
          ? packagePricing.conditionRules[
              quoteData.condition
            ]
          : 0,
      missingDeduction:
        calculateMissingItemDeduction(
          packagePricing
        ),
      extras:
        extrasValue
    };

  }


  /* ============================================================
     QUOTE SUMMARY
     ============================================================ */

  function renderQuoteSummary() {

    const summary =
      document.getElementById(
        "quote-summary"
      );

    if (!summary) {
      return;
    }

    const result =
      calculateInstantQuote();

    quoteData.quoteAmount =
      result.amount;

    let html = "";

    html += `
      <h3>Your Instant Quote</h3>

      <p>
        <strong>
          ${escapeHTML(
            getModelName(quoteData.model)
          )}
        </strong>
      </p>

      <p>
        <strong>Package:</strong>
        ${escapeHTML(
          getPackageName(
            quoteData.model,
            quoteData.package
          )
        )}
      </p>

      <p>
        <strong>Condition:</strong>
        ${escapeHTML(
          quoteData.condition
        )}
      </p>

      <p>
        <strong>Flight time:</strong>
        ${
          quoteData.flightHours !== ""
            ? escapeHTML(
                quoteData.flightHours
              ) + " hours"
            : escapeHTML(
                quoteData.flightHoursRange
              )
        }
      </p>

      <p>
        <strong>Batteries:</strong>
        ${quoteData.batteries.length}
      </p>
    `;

    if (
      result.status === "automatic"
    ) {

      html += `

        <div class="quote-price-box">

          <h3>
            Estimated purchase price
          </h3>

          <p
            class="quote-price"
            style="
              font-size:2.4rem;
              font-weight:800;
              margin:0.5rem 0;
            "
          >
            ${formatMoney(result.amount)}
          </p>

          <p>
            This is the current automatic purchase quote
            based on the information supplied.
          </p>

        </div>

      `;

    } else {

      html += `

        <div class="manual-valuation-box">

          <h3>
            MANUAL VALUATION REQUIRED
          </h3>

          <p>
            We need to manually assess this equipment
            before confirming a purchase price.
          </p>

          <p>
            <strong>Reason:</strong>
            ${escapeHTML(result.reason)}
          </p>

          <p>
            Your information can still be submitted
            for review.
          </p>

        </div>

      `;

    }

    summary.innerHTML =
      html;

  }


  /* ============================================================
     STEP 13 - CUSTOMER DETAILS
     ============================================================ */

  function validateCustomerDetails() {

    const fullName =
      document.getElementById(
        "full-name"
      );

    const email =
      document.getElementById(
        "email-address"
      );

    const phone =
      document.getElementById(
        "phone-number"
      );

    const address1 =
      document.getElementById(
        "address-line-1"
      );

    const city =
      document.getElementById(
        "city"
      );

    const county =
      document.getElementById(
        "county"
      );

    const postcode =
      document.getElementById(
        "postcode"
      );

    const legalRight =
      form.querySelector(
        'input[name="legalRight"]:checked'
      );

    if (
      !fullName ||
      !fullName.value.trim()
    ) {

      alert(
        "Please enter your full name."
      );

      return false;

    }

    if (
      !email ||
      !email.value.trim()
    ) {

      alert(
        "Please enter your email address."
      );

      return false;

    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.value.trim()
      )
    ) {

      alert(
        "Please enter a valid email address."
      );

      return false;

    }

    if (
      !phone ||
      !phone.value.trim()
    ) {

      alert(
        "Please enter your telephone number."
      );

      return false;

    }

    if (
      !address1 ||
      !address1.value.trim()
    ) {

      alert(
        "Please enter your full return address."
      );

      return false;

    }

    if (
      !city ||
      !city.value.trim()
    ) {

      alert(
        "Please enter your town or city."
      );

      return false;

    }

    if (
      !county ||
      !county.value.trim()
    ) {

      alert(
        "Please enter your county."
      );

      return false;

    }

    if (
      !postcode ||
      !postcode.value.trim()
    ) {

      alert(
        "Please enter your postcode."
      );

      return false;

    }

    const postcodePattern =
      /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

    if (
      !postcodePattern.test(
        postcode.value.trim()
      )
    ) {

      alert(
        "Please enter a valid UK postcode."
      );

      return false;

    }

    if (!legalRight) {

      alert(
        "Please confirm that you have the legal right to sell the equipment."
      );

      return false;

    }

    quoteData.fullName =
      fullName.value.trim();

    quoteData.email =
      email.value.trim();

    quoteData.phone =
      phone.value.trim();

    quoteData.addressLine1 =
      address1.value.trim();

    const address2 =
      document.getElementById(
        "address-line-2"
      );

    quoteData.addressLine2 =
      address2
        ? address2.value.trim()
        : "";

    quoteData.city =
      city.value.trim();

    quoteData.county =
      county.value.trim();

    quoteData.postcode =
      postcode.value
        .trim()
        .toUpperCase();

    quoteData.legalRight =
      legalRight.value;

    if (
      quoteData.legalRight !== "yes"
    ) {

      alert(
        "We cannot automatically purchase equipment where ownership is uncertain. The submission will require manual review."
      );

    }

    return true;

  }


  /* ============================================================
     SAVE QUOTE LOCALLY
     ============================================================ */

  function saveQuoteLocally() {

    const safeData = {

      manufacturer:
        quoteData.manufacturer,

      model:
        quoteData.model,

      package:
        quoteData.package,

      condition:
        quoteData.condition,

      flightHours:
        quoteData.flightHours,

      flightHoursRange:
        quoteData.flightHoursRange,

      batteries:
        quoteData.batteries,

      unbound:
        quoteData.unbound,

      damage:
        quoteData.damage,

      damageDescription:
        quoteData.damageDescription,

      packageContents:
        quoteData.packageContents,

      droneSerial:
        quoteData.droneSerial,

      controllerSerial:
        quoteData.controllerSerial,

      legalRight:
        quoteData.legalRight,

      fullName:
        quoteData.fullName,

      email:
        quoteData.email,

      phone:
        quoteData.phone,

      addressLine1:
        quoteData.addressLine1,

      addressLine2:
        quoteData.addressLine2,

      city:
        quoteData.city,

      county:
        quoteData.county,

      postcode:
        quoteData.postcode,

      quoteAmount:
        quoteData.quoteAmount,

      quoteReference:
        quoteData.quoteReference,

      created:
        new Date().toISOString()

    };

    try {

      localStorage.setItem(
        "wba_latest_quote",
        JSON.stringify(safeData)
      );

    } catch (error) {

      console.warn(
        "Could not save quote locally.",
        error
      );

    }

  }


  /* ============================================================
     STEP 14
     ============================================================ */

  function renderSubmittedQuote() {

    const reference =
      document.getElementById(
        "quote-reference"
      );

    if (reference) {

      reference.textContent =
        quoteData.quoteReference;

    }

  }


  /* ============================================================
     FINAL OFFER / BANK DETAILS
     ============================================================ */

  function setupFinalOffer() {

    const accept =
      document.querySelector(
        ".btn-final-accept"
      );

    const decline =
      document.querySelector(
        ".btn-final-decline"
      );

    const result =
      document.getElementById(
        "final-offer-result"
      );

    if (accept) {

      accept.addEventListener(
        "click",
        function () {

          if (!result) {
            return;
          }

          result.hidden =
            false;

          result.innerHTML = `

            <hr>

            <h3>
              Final Offer Accepted
            </h3>

            <p>
              The final offer has been accepted.
            </p>

            <h3>
              Payment Details
            </h3>

            <p>
              Please provide the bank account into which
              payment should be made.
            </p>

            <label for="bank-name">
              Account Name
            </label>

            <input
              type="text"
              id="bank-name"
              autocomplete="name"
            >

            <label for="account-number">
              Account Number
            </label>

            <input
              type="text"
              id="account-number"
              inputmode="numeric"
              maxlength="8"
            >

            <label for="sort-code">
              Sort Code
            </label>

            <input
              type="text"
              id="sort-code"
              inputmode="numeric"
              maxlength="8"
              placeholder="12-34-56"
            >

            <button
              type="button"
              id="submit-bank-details"
              class="btn-next"
            >
              Submit Bank Details
            </button>

            <p>
              <strong>
                BACKEND PAYMENT INTEGRATION REQUIRED
              </strong>
            </p>

          `;

          accept.hidden =
            true;

          if (decline) {
            decline.hidden =
              true;
          }

          const bankButton =
            document.getElementById(
              "submit-bank-details"
            );

          if (bankButton) {

            bankButton.addEventListener(
              "click",
              function () {

                const bankName =
                  document.getElementById(
                    "bank-name"
                  );

                const account =
                  document.getElementById(
                    "account-number"
                  );

                const sort =
                  document.getElementById(
                    "sort-code"
                  );

                if (
                  !bankName.value.trim() ||
                  !account.value.trim() ||
                  !sort.value.trim()
                ) {

                  alert(
                    "Please enter the account name, account number and sort code."
                  );

                  return;

                }

                quoteData.bankName =
                  bankName.value.trim();

                quoteData.accountNumber =
                  account.value.trim();

                quoteData.sortCode =
                  sort.value.trim();

                alert(
                  "Bank details captured for this prototype. A secure backend payment system is required before real banking information should be submitted."
                );

              }
            );

          }

        }
      );

    }


    if (decline) {

      decline.addEventListener(
        "click",
        function () {

          if (!result) {
            return;
          }

          result.hidden =
            false;

          result.innerHTML = `

            <hr>

            <h3>
              Final Offer Declined
            </h3>

            <p>
              The equipment will be returned to the
              full return address supplied during your
              quote submission.
            </p>

            <p>
              <strong>
                BACKEND SHIPPING / RETURNS INTEGRATION REQUIRED
              </strong>
            </p>

          `;

          accept.hidden =
            true;

          decline.hidden =
            true;

        }
      );

    }

  }


  /* ============================================================
     MODEL / PACKAGE CHANGE EVENTS
     ============================================================ */

  function setupSelectEvents() {

    const modelSelect =
      document.getElementById(
        "dji-model"
      );

    if (modelSelect) {

      modelSelect.addEventListener(
        "change",
        function () {

          quoteData.model =
            modelSelect.value;

          quoteData.package =
            "";

          populatePackages();

        }
      );

    }


    const packageSelect =
      document.getElementById(
        "package-select"
      );

    if (packageSelect) {

      packageSelect.addEventListener(
        "change",
        function () {

          quoteData.package =
            packageSelect.value;

        }
      );

    }

  }


  /* ============================================================
     MAIN BUTTON HANDLER
     
     Event delegation means buttons still work even where
     later steps are dynamically created.
     ============================================================ */

  form.addEventListener(
    "click",
    function (event) {

      const target =
        event.target.closest("button");

      if (!target) {
        return;
      }

      event.preventDefault();

      /* Add Battery */

      if (
        target.id ===
        "add-battery-btn"
      ) {

        createBatteryEntry();

        return;

      }


      /* Next */

      if (
        target.classList.contains(
          "btn-next"
        )
      ) {

        handleNext();

        return;

      }


      /* Back */

      if (
        target.classList.contains(
          "btn-back"
        )
      ) {

        if (currentStep > 0) {

          showStep(
            currentStep - 1
          );

        }

        return;

      }


      /* Accept Instant Quote */

      if (
        target.classList.contains(
          "btn-accept"
        )
      ) {

        quoteData.quoteAmount =
          calculateInstantQuote().amount;

        showStep(
          getStepIndex(13)
        );

        return;

      }

    }
  );


  /* ============================================================
     NEXT HANDLER
     ============================================================ */

  function handleNext() {

    refreshSteps();

    const stepNumber =
      Number(
        steps[currentStep].dataset.step
      );


    /* STEP 1 */

    if (stepNumber === 1) {

      if (!validateManufacturer()) {
        return;
      }

      if (
        quoteData.manufacturer.toLowerCase() ===
        "dji"
      ) {

        populateDjiModels();

        showStep(
          getStepIndex(2)
        );

        return;

      }

      alert(
        "This manufacturer is not currently supported."
      );

      return;

    }


    /* STEP 2 */

    if (stepNumber === 2) {

      if (!validateModel()) {
        return;
      }

      populatePackages();

      showStep(
        getStepIndex(3)
      );

      return;

    }


    /* STEP 3 */

    if (stepNumber === 3) {

      if (!validatePackage()) {
        return;
      }

      showStep(
        getStepIndex(4)
      );

      return;

    }


    /* STEP 4 */

    if (stepNumber === 4) {

      if (!validateCondition()) {
        return;
      }

      showStep(
        getStepIndex(5)
      );

      return;

    }


    /* STEP 5 */

    if (stepNumber === 5) {

      if (!validateFlightTime()) {
        return;
      }

      ensureBatteryStep();

      showStep(
        getStepIndex(6)
      );

      return;

    }


    /* STEP 6 */

    if (stepNumber === 6) {

      if (!validateBatteries()) {
        return;
      }

      showStep(
        getStepIndex(7)
      );

      return;

    }


    /* STEP 7 */

    if (stepNumber === 7) {

      if (!validateUnbound()) {
        return;
      }

      showStep(
        getStepIndex(8)
      );

      return;

    }


    /* STEP 8 */

    if (stepNumber === 8) {

      if (!validateDamage()) {
        return;
      }

      showStep(
        getStepIndex(9)
      );

      return;

    }


    /* STEP 9 */

    if (stepNumber === 9) {

      if (!validatePackageContents()) {
        return;
      }

      showStep(
        getStepIndex(10)
      );

      return;

    }


    /* STEP 10 */

    if (stepNumber === 10) {

      if (!validateSerialNumbers()) {
        return;
      }

      showStep(
        getStepIndex(11)
      );

      return;

    }


    /* STEP 11 */

    if (stepNumber === 11) {

      if (!validatePhotos()) {
        return;
      }

      showStep(
        getStepIndex(12)
      );

      return;

    }


    /* STEP 13 */

    if (stepNumber === 13) {

      if (!validateCustomerDetails()) {
        return;
      }

      quoteData.quoteReference =
        generateQuoteReference();

      saveQuoteLocally();

      renderSubmittedQuote();

      showStep(
        getStepIndex(14)
      );

      return;

    }


    /* STEP 14 */

    if (stepNumber === 14) {

      showStep(
        getStepIndex(15)
      );

      return;

    }


    /* STEP 15 */

    if (stepNumber === 15) {

      showStep(
        getStepIndex(16)
      );

      return;

    }

  }


  /* ============================================================
     STEP INDEX
     ============================================================ */

  function getStepIndex(stepNumber) {

    refreshSteps();

    const index =
      steps.findIndex(
        function (step) {

          return Number(
            step.dataset.step
          ) === stepNumber;

        }
      );

    return index;

  }


  /* ============================================================
     FIX STEP 6 ADD-BATTERY BUTTON
     ============================================================ */

  function setupBatteryButton() {

    const button =
      document.getElementById(
        "add-battery-btn"
      );

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        createBatteryEntry();

      }
    );

  }


  /* ============================================================
     ENSURE STEP 6 HAS ITS FIRST BATTERY
     ============================================================ */

  function initialiseBatterySection() {

    const container =
      getBatteryContainer();

    if (!container) {
      return;
    }

    if (
      container.children.length === 0
    ) {

      createBatteryEntry();

    }

  }


  /* ============================================================
     INITIALISE
     ============================================================ */

  ensureLaterStepsExist();

  refreshSteps();

  populateDjiModels();

  setupSelectEvents();

  setupBatteryButton();

  initialiseBatterySection();

  setupDamageControls();

  setupFinalOffer();

  showStep(
    getStepIndex(1)
  );


  /* ============================================================
     DEBUG INFORMATION
     ============================================================ */

  console.log(
    "WE BUY ANY DRONE quote wizard loaded successfully."
  );

  console.log(
    "Wizard steps found:",
    steps.length
  );

  console.log(
    "Current step:",
    currentStep + 1
  );

});
