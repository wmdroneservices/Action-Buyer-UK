// quote.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;

  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null,
    condition: null,
    flightHours: null,
    flightHoursRange: null,
    batteries: [],
    unbound: null,
    damage: null,
    damageDescription: "",
    packageContents: {},
    droneSerial: null,
    controllerSerial: null,
    photos: [],
    legalRight: null,
  };

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
    neo: [
      {id: "neo", name: "DJI Neo"},
      {id: "neo-2", name: "DJI Neo 2"},
    ],
    lito: [
      {id: "lito-1", name: "DJI Lito 1"},
      {id: "lito-x1", name: "DJI Lito X1"},
    ],
    flip: [
      {id: "flip", name: "DJI Flip"},
    ],
    air: [
      {id: "air", name: "DJI Air"},
      {id: "air-2", name: "DJI Air 2"},
      {id: "air-2s", name: "DJI Air 2S"},
      {id: "air-3", name: "DJI Air 3"},
      {id: "air-3s", name: "DJI Air 3S"},
    ],
    mavic: [
      {id: "mavic-mini", name: "DJI Mavic Mini"},
      {id: "mavic-pro", name: "DJI Mavic Pro"},
      {id: "mavic-2-pro", name: "DJI Mavic 2 Pro"},
      {id: "mavic-2-zoom", name: "DJI Mavic 2 Zoom"},
      {id: "mavic-3", name: "DJI Mavic 3"},
      {id: "mavic-3-classic", name: "DJI Mavic 3 Classic"},
      {id: "mavic-3-pro", name: "DJI Mavic 3 Pro"},
      {id: "mavic-3-pro-cine", name: "DJI Mavic 3 Pro Cine"},
      {id: "mavic-4-pro", name: "DJI Mavic 4 Pro"},
    ],
    fpv: [
      {id: "fpv", name: "DJI FPV"},
      {id: "avata", name: "DJI Avata"},
      {id: "avata-2", name: "DJI Avata 2"},
      {id: "avata-360", name: "DJI Avata 360"},
    ],
    commercial: [
      {id: "mavic-3-enterprise", name: "DJI Mavic 3 Enterprise"},
      {id: "mavic-3-thermal", name: "DJI Mavic 3 Thermal"},
      {id: "mavic-3-multispectral", name: "DJI Mavic 3 Multispectral"},
      {id: "matrice-4e", name: "DJI Matrice 4E"},
      {id: "matrice-4t", name: "DJI Matrice 4T"},
      {id: "matrice-30", name: "DJI Matrice 30"},
      {id: "matrice-30t", name: "DJI Matrice 30T"},
      {id: "matrice-300-rtk", name: "DJI Matrice 300 RTK"},
      {id: "matrice-350-rtk", name: "DJI Matrice 350 RTK"},
      {id: "matrice-400", name: "DJI Matrice 400"},
      {id: "inspire-1", name: "DJI Inspire 1"},
      {id: "inspire-2", name: "DJI Inspire 2"},
      {id: "inspire-3", name: "DJI Inspire 3"},
      {id: "agras", name: "DJI Agras"},
    ],
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      if (progressList[i]) {
        progressList[i].setAttribute('aria-current', i === index ? 'step' : 'false');
      }
    });
    currentStep = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(step) {
    let valid = true;
    if (step.dataset.step === "1") {
      let checked = step.querySelector('input[name="manufacturer"]:checked');
      if (!checked) {
        valid = false;
        alert("Please select a manufacturer.");
      }
    } else if (step.dataset.step === "2") {
      const select = step.querySelector('#dji-model');
      if (!select.value) {
        valid = false;
        alert("Please select a DJI model.");
      }
    } else if (step.dataset.step === "3") {
      const select = step.querySelector('#package-select');
      if (!select.value) {
        valid = false;
        alert("Please select a package.");
      }
    }
    // Further validation omitted here for brevity
    return valid;
  }

  function populateDjiModels() {
    const select = document.getElementById("dji-model");
    select.innerHTML = '<option value="">-- Select a model --</option>';
    Object.values(djiModels).flat().forEach(model => {
      let opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      select.appendChild(opt);
    });
  }

  // Show or hide steps handled in showStep()

  // Navigation Buttons
  form.addEventListener("click", e => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();
      if (!validateStep(steps[currentStep])) return;

      if (currentStep === 0) {
        // From Manufacturer step to DJI Model step
        const selectedManufacturer = steps[0].querySelector('input[name="manufacturer"]:checked').value;
        quoteData.manufacturer = selectedManufacturer;

        if (selectedManufacturer === "dji") {
          populateDjiModels();
          showStep(1);
        } else {
          alert("Currently only DJI manufacturer is supported.");
        }
      } else {
        showStep(currentStep + 1);
      }
    }
    else if (e.target.classList.contains("btn-back")) {
      e.preventDefault();
      // simply go back a step
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
    else if (e.target.classList.contains("btn-accept")) {
      e.preventDefault();
      showStep(currentStep + 1);
    }
  });

  // Initialize wizard
  function init() {
    showStep(0);
  }

  init();

});
