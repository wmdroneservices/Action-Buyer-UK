document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;
  let currentStep = 0;

  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null
  };

  // DJI models catalog (expand as you like)
  const djiModels = [
    { id: "mini", name: "DJI Mini" },
    { id: "mini-se", name: "DJI Mini SE" },
    { id: "mini-2", name: "DJI Mini 2" },
    { id: "mini-2-se", name: "DJI Mini 2 SE" },
    { id: "mini-3", name: "DJI Mini 3" },
    { id: "mini-3-pro", name: "DJI Mini 3 Pro" },
    { id: "mini-4-pro", name: "DJI Mini 4 Pro" },
    { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
  ];

  // Package options keyed by model id
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
      step.hidden = i !== index;
      if (progressList[i]) {
        progressList[i].setAttribute("aria-current", i === index ? "step" : null);
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep1() {
    const checked = form.querySelector('input[name="manufacturer"]:checked');
    if (!checked) {
      alert("Please select a manufacturer.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    const modelSelect = form.querySelector("#dji-model");
    if (!modelSelect.value) {
      alert("Please select a DJI model.");
      return false;
    }
    return true;
  }

  function validateStep3() {
    const packageSelect = form.querySelector("#package-select");
    if (!packageSelect.value) {
      alert("Please select a package.");
      return false;
    }
    return true;
  }

  // Populate DJI models dropdown
  function populateModels() {
    const modelSelect = form.querySelector("#dji-model");
    modelSelect.innerHTML = '<option value="">-- Select a model --</option>';
    djiModels.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.name;
      modelSelect.appendChild(option);
    });
  }

  // Populate packages dropdown based on selected model
  function populatePackages(modelId) {
    const packageSelect = form.querySelector("#package-select");
    packageSelect.innerHTML = '<option value="">-- Select package --</option>';
    const packages = packageOptions[modelId] || {};
    Object.entries(packages).forEach(([key, label]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      packageSelect.appendChild(option);
    });
  }

  form.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();
      switch (currentStep) {
        case 0:
          if (!validateStep1()) return;
          quoteData.manufacturer = form.elements["manufacturer"].value;
          populateModels();
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
          alert("Step 3 Complete. Implement further steps.");
          break;
      }
    } else if (e.target.classList.contains("btn-back")) {
      e.preventDefault();
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
  });

  showStep(0);  
});
