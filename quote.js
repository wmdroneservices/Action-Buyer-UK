document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;

  // Catalog of models & packages used for demo
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
        progressList[i].setAttribute("aria-current", i === index ? "step" : "false");
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
    const options = packageOptions[modelId] || {};
    Object.entries(options).forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  form.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();

      switch (currentStep) {
        case 0: // Manufacturer step
          if (!validateStep1()) return;
          populateModels();
          showStep(1);
          break;

        case 1: // DJI Model step
          if (!validateStep2()) return;
          const selectedModel = form.elements["djiModel"].value;
          populatePackages(selectedModel);
          showStep(2);
          break;

        case 2: // Package step
          if (!validateStep3()) return;
          alert("Step 3 complete. Build further steps similarly.");
          // For now you can proceed to next steps here.
          break;
      }
    }

    if (e.target.classList.contains("btn-back")) {
      e.preventDefault();
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
  });

  // Initialize wizard
  showStep(0);
});
