// quote.js

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;
  let currentStep = 0;

  // Data store for user selections and inputs
  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null,
    // extend with further fields for other steps...
  };

  // DJI Models catalogue (expand as needed)
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

