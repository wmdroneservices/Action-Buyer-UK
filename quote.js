/* quote.js */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  if (!form) { console.error("quote-form not found in DOM"); return; }

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressItems = document.querySelectorAll(".progress-step");
  let currentStep = 0;

  // Existing DJI models from pricing database retained here:
  const models = [
    "mini", "mini-se", "mini-2", "mini-2-se", "mini-3", "mini-3-pro", "mini-4-pro", "mini-5-pro",
    // Add all others from your pricing/model database here
  ];

  // Package options matching your spec (example for mini-5-pro)
  const packageOptions = {
    "mini-5-pro": {
      "drone-only": "Drone only",
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2",
      "fly-more-plus-rc-2": "Fly More Combo Plus + RC 2"
    },
    // Add your full set here as per original data
  };

  function showStep(index) {
    if (index < 0 || index >= steps.length) return;
    steps.forEach((step, i) => {
      step.hidden = (i !== index);
      if (progressItems[i]) {
        progressItems[i].setAttribute("aria-current", i === index ? "step" : null);
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep() {
    const step = steps[currentStep];
    if (!step) return false;

    // Validate radios
    const requiredRadios = step.querySelectorAll("input[required][type=radio]");
    for (const radio of requiredRadios) {
      const name = radio.name;
      if (!step.querySelector(`input[name="${name}"]:checked`)) {
        alert("Please select an option.");
        return false;
      }
    }

    // Validate selects and inputs with required attribute and visible in this step
    const requiredFields = step.querySelectorAll("select[required]:not(:disabled), input[required]:not(:disabled), textarea[required]:not(:disabled)");
    for (const field of requiredFields) {
      if (!field.value || field.value.trim() === "") {
        alert("Please fill out the required fields.");
        return false;
      }
    }

    return true;
  }

  // Populate DJI model dropdown dynamically on Step 2
  function populateDjiModels() {
    const select = form.querySelector("#dji-model");
    if (!select) {
      console.error("DJI model select not found");
      return;
    }
    select.innerHTML = '<option value="">-- Select a model --</option>';

    // Use your pricing/model database here to add options
    // For demonstration, using models list:
    models.forEach(mId => {
      const option = document.createElement("option");
      option.value = mId;
      option.textContent = mId.replace(/-/g, " ").toUpperCase();
      select.appendChild(option);
    });
  }

  // Populate package options based on model selection on Step 3
  function populatePackages(modelId) {
    const select = form.querySelector("#package-select");
    if (!select) {
      console.error("Package select not found");
      return;
    }
    select.innerHTML = '<option value="">-- Select package --</option>';
    const packages = packageOptions[modelId];
    if (!packages) {
      // Fallback to standard
      const option = document.createElement("option");
      option.value = "standard";
      option.textContent = "Standard Package";
      select.appendChild(option);
      return;
    }
    Object.entries(packages).forEach(([key, label]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  form.addEventListener("click", e => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();
      if (!validateStep()) return;

      if (currentStep === 0) {
        populateDjiModels();
      } else if (currentStep === 1) {
        const modelId = form.elements["djiModel"].value;
        populatePackages(modelId);
      }

      if (currentStep < steps.length - 1) {
        showStep(currentStep + 1);
      }
    }
    else if (e.target.classList.contains("btn-back")) {
      e.preventDefault();
      if (currentStep > 0) showStep(currentStep - 1);
    }
  });

  // Initialize wizard at step 0
  showStep(0);
});
