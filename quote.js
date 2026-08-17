document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('quote-form');
  const steps = Array.from(form.querySelectorAll('.wizard-step'));
  const progressItems = document.querySelectorAll('.progress-step');
  let currentStep = 0;

  // DJI models and packages data per your spec
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
    // ... other categories as per your list
  };

  const packageOptions = {
    "mini-5-pro": {
      "drone-only": "Drone only",
      "standard-rc-n3": "Standard + RC-N3",
      "fly-more-rc-n3": "Fly More Combo + RC-N3",
      "fly-more-rc-2": "Fly More Combo + RC 2",
      "fly-more-plus-rc-2": "Fly More Combo Plus + RC 2",
    },
    // ... rest as per your full spec
  };

  // Navigation
  function showStep(step) {
    steps.forEach((s, i) => {
      s.hidden = i !== step;
      progressItems[i].setAttribute('aria-current', i === step ? 'step' : 'false');
    });
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Validations (simplified)
  function validateStep() {
    const step = steps[currentStep];
    const requiredInputs = step.querySelectorAll('input[required], select[required]');
    for (let input of requiredInputs) {
      if ((input.type === 'radio' && !step.querySelector(`input[name="${input.name}"]:checked`)) ||
          (input.type !== 'radio' && !input.value)) {
        alert("Please complete all required fields.");
        return false;
      }
    }
    return true;
  }

  // Populate DJI models select
  function populateDjiModels() {
    const select = form.querySelector('#dji-model');
    select.innerHTML = '<option value="">-- Select a model --</option>';
    Object.values(djiModels).flat().forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      select.appendChild(option);
    });
  }

  // Populate packages select
  function populatePackages(modelId) {
    const select = form.querySelector('#package-select');
    select.innerHTML = '<option value="">-- Select package --</option>';
    const pkgs = packageOptions[modelId];
    if (!pkgs) {
      select.innerHTML = '<option value="">Standard Package</option>';
      return;
    }
    Object.entries(pkgs).forEach(([key, label]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  // Event listeners for navigation buttons
  form.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-next')) {
      e.preventDefault();
      if (!validateStep()) return;

      switch (currentStep) {
        case 0:
          populateDjiModels();
          break;
        case 1:
          const modelId = form.elements.djiModel.value;
          populatePackages(modelId);
          break;
      }

      if (currentStep < steps.length - 1) showStep(currentStep + 1);
    }
    else if (e.target.classList.contains('btn-back')) {
      e.preventDefault();
      if (currentStep > 0) showStep(currentStep - 1);
    }
  });

  // Init
  showStep(0);
});
