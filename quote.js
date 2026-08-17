// quote.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;
  let currentStep = 0;

  // Store collected data here
  const quoteData = {};

  // DJI Models Catalog
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
    // Add other categories as needed
  };

  // Package options keyed by model ID
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
    // Add other models...
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      if (progressList[i]) {
        progressList[i].setAttribute("aria-current", i === index ? "step" : "false");
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep1() {
    const checked = steps[0].querySelector('input[name="manufacturer"]:checked');
    if (!checked) {
      alert("Please select a manufacturer.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    const select = steps[1].querySelector('#dji-model');
    if (!select.value) {
      alert("Please select a DJI model.");
      return false;
    }
    return true;
  }

  function validateStep3() {
    const select = steps[2].querySelector('#package-select');
    if (!select.value) {
      alert("Please select a package.");
      return false;
    }
    return true;
  }

  function populateDjiModels() {
    const select = document.getElementById("dji-model");
    select.innerHTML = '<option value="">-- Select a model --</option>';
    Object.values(djiModels).flat().forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      select.appendChild(opt);
    });
  }

  function populatePackages(modelId) {
    const select = document.getElementById("package-select");
    select.innerHTML = '<option value="">-- Select package --</option>';
    if (!modelId) return;
    const pkgs = packageOptions[modelId];
    if (!pkgs) {
      const opt = document.createElement("option");
      opt.value = "standard";
      opt.textContent = "Standard Package";
      select.appendChild(opt);
      return;
    }
    Object.entries(pkgs).forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  // On Next button click
  form.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();

      switch (currentStep) {
        case 0:
          if (!validateStep1()) return;
          quoteData.manufacturer = form.elements["manufacturer"].value;
          if (quoteData.manufacturer === "dji") {
            populateDjiModels();
          }
          showStep(1);
          break;
        case 1:
          if (!validateStep2()) return;
          quoteData.djiModel = form.elements["djiModel"].value;
          populatePackages(quoteData.djiModel);
          showStep(2);
          break;
        case 2:
          if (!validateStep3()) return;
          quoteData.package = form.elements["package"].value;
          // Proceed to Step 4, add validation/logic as needed
          showStep(3);
          break;
        default:
          // For other steps, just advance (you can add validations similarly)
          if (currentStep < steps.length -1) {
            showStep(currentStep + 1);
          }
          break;
      }
    } else if (e.target.classList.contains("btn-back")) {
      e.preventDefault();
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
  });

  // Initialize
  showStep(0);
});
