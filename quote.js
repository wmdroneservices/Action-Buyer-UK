// quote.js

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;

  // Data storage for form inputs
  const quoteData = {
    manufacturer: null,
    djiModel: null,
    package: null,
    condition: null,
    flightHours: null,
    flightHoursRange: null,
    batteries: [], // {type: string, cycles: number} objects
    unbound: null,
    damage: null,
    damageDescription: "",
    packageContents: {},
    droneSerial: null,
    controllerSerial: null,
    photos: [],
    legalRight: null,
  };

  // DJI Models grouped by category
  const djiModels = {
    mini: [
      { id: "mini", name: "DJI Mini" },
      { id: "mini-se", name: "DJI Mini SE" },
      { id: "mini-2", name: "DJI Mini 2" },
      { id: "mini-2-se", name: "DJI Mini 2 SE" },
      { id: "mini-3", name: "DJI Mini 3" },
      { id: "mini-3-pro", name: "DJI Mini 3 Pro" },
      { id: "mini-4-pro", name: "DJI Mini 4 Pro" },
      { id: "mini-5-pro", name: "DJI Mini 5 Pro" }
    ],
    neo: [
      { id: "neo", name: "DJI Neo" },
      { id: "neo-2", name: "DJI Neo 2" }
    ],
    lito: [
      { id: "lito-1", name: "DJI Lito 1" },
      { id: "lito-x1", name: "DJI Lito X1" }
    ],
    flip: [
