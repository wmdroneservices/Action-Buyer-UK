document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;

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

  function validateManufacturerStep() {
    const checked = steps[0].querySelector('input[name="manufacturer"]:checked');
    if (!checked) {
      alert("Please select a manufacturer.");
      return false;
    }
    return true;
  }

  function populateDjiModels() {
    const select = document.getElementById("dji-model");
    select.innerHTML = '<option value="">-- Select a model --</option>';
    const models = [
      { id: "mini", name: "DJI Mini" },
      { id: "mini-se", name: "DJI Mini SE" },
      { id: "mini-2", name: "DJI Mini 2" },
      { id: "mini-2-se", name: "DJI Mini 2 SE" },
      { id: "mini-3", name: "DJI Mini 3" },
      { id: "mini-3-pro", name: "DJI Mini 3 Pro" },
      { id: "mini-4-pro", name: "DJI Mini 4 Pro" },
      { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
    ];
    models.forEach(({ id, name }) => {
      const option = document.createElement("option");
      option.value = id;
      option.text = name;
      select.appendChild(option);
    });
  }

  form.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-next")) {
      e.preventDefault();

      if (currentStep === 0) {
        if (!validateManufacturerStep()) return;
        populateDjiModels();
        showStep(1);
      } else if (currentStep < steps.length - 1) {
        showStep(currentStep + 1);
      }
    }

    if (e.target.classList.contains("btn-back")) {
      e.preventDefault();

      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    }
  });

  showStep(0);
});
