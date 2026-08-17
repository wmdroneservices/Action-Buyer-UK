document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let currentStep = 0;

  // DJI models catalog - expand as needed
  const djiModels = [
    { id: "mini", name: "DJI Mini" },
    { id: "mini-se", name: "DJI Mini SE" },
    { id: "mini-2", name: "DJI Mini 2" },
    { id: "mini-5-pro", name: "DJI Mini 5 Pro" },
    // add all others...
  ];

  // Package options keys mapped by model id
  const packageOptions = {
    'mini-5-pro': {
      'drone-only': 'Drone only',
      'fly-more-rc-2': 'Fly More Combo + RC 2'
    },
    'mini-2': {
      'drone-only': 'Drone only',
      'fly-more': 'Fly More Combo'
    }
    // add others...
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function populateModels() {
    const select = document.getElementById('dji-model');
    select.innerHTML = '<option value="">-- Select a model --</option>';
    djiModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.text = m.name;
      select.appendChild(opt);
    });
  }

  function populatePackages(modelId) {
    const select = document.getElementById('package-select');
    select.innerHTML = '<option value="">-- Select package --</option>';
    const pkgs = packageOptions[modelId] || {};
    Object.entries(pkgs).forEach(([key, label]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.text = label;
      select.appendChild(opt);
    });
  }

  form.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-next')) {
      e.preventDefault();

      switch (currentStep) {
        case 0:
          const manufacturer = form.querySelector('input[name="manufacturer"]:checked');
          if (!manufacturer) {
            alert('Please select a manufacturer.');
            return;
          }
          // For now only support DJI
          if (manufacturer.value !== 'dji') {
            alert("Sorry, currently only DJI is supported.");
            return;
          }
          populateModels();
          showStep(1);
          break;

        case 1:
          const modelSelect = document.getElementById('dji-model');
          if (!modelSelect.value) {
            alert('Please select a DJI model.');
            return;
          }
          populatePackages(modelSelect.value);
          showStep(2);
          break;

        case 2:
          const packageSelect = document.getElementById('package-select');
          if (!packageSelect.value) {
            alert('Please select a package.');
            return;
          }
          // Continue to next step or add further validation here
          showStep(3);
          break;

        default:
          if (currentStep < steps.length - 1) {
            showStep(currentStep + 1);
          }
          break;
      }
    } 
    else if (e.target.classList.contains('btn-back')) {
      e.preventDefault();
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
  });

  showStep(0);
});
