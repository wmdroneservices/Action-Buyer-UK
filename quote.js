document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".wizard-step");
  const form = document.getElementById("quote-form");
  const djiModelsSelect = document.getElementById("dji-model");
  const packageSelect = document.getElementById("package-select");
  let currentStep = 0;

  // DJI Models data
  const djiModels = [
    {id: "mini-5-pro", name: "DJI Mini 5 Pro"},
    {id: "mini-4-pro", name: "DJI Mini 4 Pro"},
    {id: "mini-3-pro", name: "DJI Mini 3 Pro"},
    {id: "mini-3", name: "DJI Mini 3"},
    {id: "mini-2", name: "DJI Mini 2"},
  ];

  // Package options
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
    }
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
    currentStep = index;
  }

  function validateStep() {
    const current = steps[currentStep];
    const requiredInput = current.querySelector("input[required], select[required]");
    if (!requiredInput) return true;  // no required fields
    if (requiredInput.type === "radio") {
      const name = requiredInput.name;
      const checked = current.querySelector(`input[name="${name}"]:checked`);
      if (!checked) {
        alert("Please make a selection.");
        return false;
      }
    } else if (!requiredInput.value) {
      alert("Please complete the required field.");
      return false;
    }
    return true;
  }

  // Populate DJI models dropdown in Step 2
  function populateModels() {
    djiModelsSelect.innerHTML = "<option value=''>Choose your model...</option>";
    djiModels.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      djiModelsSelect.appendChild(opt);
    });
  }

  // Populate packages dropdown in Step 3
  function populatePackages(model) {
    packageSelect.innerHTML = "<option value=''>Choose your package...</option>";
    const packages = packageOptions[model];
    if (!packages) return;
    Object.entries(packages).forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      packageSelect.appendChild(opt);
    });
  }

  form.addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") return;

    if (e.target.id === "next") {
      e.preventDefault();
      if (!validateStep()) return;

      if (currentStep === 0) {
        populateModels();
      }
      if (currentStep === 1) {
        const selectedModel = djiModelsSelect.value;
        if (!selectedModel) {
          alert("Please select a DJI model.");
          return;
        }
        populatePackages(selectedModel);
      }
      showStep(currentStep + 1);
    }

    if (e.target.id === "back") {
      e.preventDefault();
      showStep(currentStep - 1);
    }
  });

});
