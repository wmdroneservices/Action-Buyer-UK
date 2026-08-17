document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");

  // Show step logic (basic)
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  function showStep(index) {
    steps.forEach((s, i) => s.hidden = i !== index);
  }

  let currentStep = 0;
  showStep(currentStep);

  // Populate DJI models for testing
  const models = [
    { id: "mini-2", name: "DJI Mini 2" },
    { id: "mini-3", name: "DJI Mini 3" },
    { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
  ];
  const modelSelect = document.getElementById("dji-model");
  models.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = model.name;
    modelSelect.appendChild(opt);
  });

  form.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-next")) return;
    e.preventDefault();

    if (currentStep === 0) {
      // Assume Step 1 validation passed and move to step 2
      currentStep = 1;
      showStep(currentStep);
      return;
    }

    if (currentStep === 1) { // Step 2: DJI Model validation
      if (!modelSelect.value) {
        alert("Please select a DJI model.");
        return;
      }
      // Move to next step (Step 3)
      currentStep = 2;
      showStep(currentStep);
      alert("Step 2 passed, showing Step 3 (you need to implement Step 3 UI).");
      return;
    }
  });

  form.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-back")) return;
    e.preventDefault();
    if (currentStep > 0) {
      currentStep -= 1;
      showStep(currentStep);
    }
  });
});
