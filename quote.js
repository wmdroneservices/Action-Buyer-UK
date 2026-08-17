document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  const progressList = document.getElementById("progress-indicator").children;

  let currentStep = 0;
  let batteryCount = 0;

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
    legalRight: null
  };

  const djiModels = [
    { id: "mini", name: "DJI Mini" },
    { id: "mini-se", name: "DJI Mini SE" },
    { id: "mini-2", name: "DJI Mini 2" },
    { id: "mini-2-se", name: "DJI Mini 2 SE" },
    { id: "mini-3", name: "DJI Mini 3" },
    { id: "mini-3-pro", name: "DJI Mini 3 Pro" },
    { id: "mini-4-pro", name: "DJI Mini 4 Pro" },
    { id: "mini-5-pro", name: "DJI Mini 5 Pro" },
    { id: "neo", name: "DJI Neo" },
    { id: "neo-2", name: "DJI Neo 2" },
    { id: "lito-1", name: "DJI Lito 1" },
    { id: "lito-x1", name: "DJI Lito X1" },
    { id: "flip", name: "DJI Flip" },
    { id: "air", name: "DJI Air" },
    { id: "air-2", name: "DJI Air 2" },
    { id: "air-2s", name: "DJI Air 2S" },
    { id: "air-3", name: "DJI Air 3" },
    { id: "air-3s", name: "DJI Air 3S" },
    { id: "mavic-mini", name: "DJI Mavic Mini" },
    { id: "mavic-pro", name: "DJI Mavic Pro" },
    { id: "mavic-2-pro", name: "DJI Mavic 2 Pro" },
    { id: "mavic-2-zoom", name: "DJI Mavic 2 Zoom" },
    { id: "mavic-3", name: "DJI Mavic 3" },
    { id: "mavic-3-classic", name: "DJI Mavic 3 Classic" },
    { id: "mavic-3-pro", name: "DJI Mavic 3 Pro" },
    { id: "mavic-3-pro-cine", name: "DJI Mavic 3 Pro Cine" },
    { id: "mavic-4-pro", name: "DJI Mavic 4 Pro" },
    { id: "fpv", name: "DJI FPV" },
    { id: "avata", name: "DJI Avata" },
    { id: "avata-2", name: "DJI Avata 2" },
    { id: "avata-360", name: "DJI Avata 360" }
  ];

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
    // Add other models similarly...
  };

  function showStep(index) {
    steps.forEach((step,i) => {
      step.hidden = i !== index;
      if(progressList[i]){
        progressList[i].setAttribute("aria-current", i===index?"step":null);
      }
    });
    currentStep = index;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  // Validation functions (implement comprehensive later)
  function validateStep(stepIndex){
    switch(stepIndex){
      case 0: return !!form.querySelector('input[name="manufacturer"]:checked');
      case 1: return !!form.elements["djiModel"].value;
      case 2: return !!form.elements["package"].value;
      case 3: return !!form.querySelector('input[name="condition"]:checked');
      case 4: {
        const fhVal = form.elements["flightHours"].value,
              fhRange = form.querySelector('input[name="flightHoursRange"]:checked');
        return (fhVal && fhVal > 0) || fhRange;
      }
      case 5: return quoteData.batteries.length > 0;
      case 6: return !!form.querySelector('input[name="unbound"]:checked');
      case 7: return !!form.querySelector('input[name="damage"]:checked');
      case 8: {
        // Check all package contents selects answered...
        const selects = form.querySelectorAll('[name^="packageContents-"]');
        return Array.from(selects).every(s => s.value !== "");
      }
      case 9: return form.elements["droneSerial"].value.trim() !== "";
      case 10: return form.querySelector('#photo-uploads').files.length > 0;
      case 12: {
        // Customer details validation (simplified)
        const reqFields = ["fullName","email","phone","addressLine1","city","county","postcode"];
        for(let f of reqFields){
          if(!form.elements[f].value.trim()) return false;
        }
        if(!form.querySelector('input[name="legalRight"]:checked')) return false;
        return true;
      }
      default: return true;
    }
  }

  function populateModels(){
    const select = form.elements["djiModel"];
    select.innerHTML = '<option value="">-- Select a model --</option>';
    djiModels.forEach(m=>{
      let opt = new Option(m.name,m.id);
      select.appendChild(opt);
    });
  }

  function populatePackages(modelId){
    const select = form.elements["package"];
    select.innerHTML = '<option value="">-- Select package --</option>';
    const pkgs = packageOptions[modelId] || {"standard":"Standard Package"};
    Object.entries(pkgs).forEach(([key,label])=>{
      let opt = new Option(label,key);
      select.appendChild(opt);
    });
  }

  // Battery UI handlers
  function addBattery(battery={type:"",cycles:""}){
    const container = document.getElementById("batteries-container");
    let count = container.children.length + 1;
    let div = document.createElement("div");
    div.className = "battery-entry";
    div.innerHTML = `
      <label>Battery Type:<input type="text" name="batteryType${count}" value="${battery.type}" required /></label>
      <label> Cycle Count:<input type="number" min="0" name="batteryCycles${count}" value="${battery.cycles}" required /></label>
      <button type="button" class="btn btn-remove-battery">Remove Battery</button>
      <hr/>
    `;
    container.appendChild(div);
    div.querySelector(".btn-remove-battery").addEventListener("click", ()=>{
      container.removeChild(div);
      updateBatteriesData();
    });
  }

  function updateBatteriesData(){
    const container = document.getElementById("batteries-container");
    quoteData.batteries = [];
    container.querySelectorAll(".battery-entry").forEach(entry=>{
      let type = entry.querySelector('input[type="text"]').value.trim();
      let cycles = parseInt(entry.querySelector('input[type="number"]').value);
      if(type && !isNaN(cycles)){
        quoteData.batteries.push({type,cycles});
      }
    });
  }

  form.addEventListener("click", e=>{
    if(e.target.classList.contains("btn-next")){
      e.preventDefault();
      if(!validateStep(currentStep)){
        alert("Please complete the required fields before proceeding.");
        return;
      }
      // Store current step values
      switch(currentStep){
        case 0: quoteData.manufacturer = form.elements["manufacturer"].value; populateModels(); break;
        case 1: quoteData.djiModel = form.elements["djiModel"].value; populatePackages(quoteData.djiModel); break;
        case 2: quoteData.package = form.elements["package"].value; break;
        case 3: quoteData.condition = form.querySelector('input[name="condition"]:checked').value; break;
        case 4: {
          const fhVal = form.elements["flightHours"].value;
          const fhRangeSelected = form.querySelector('input[name="flightHoursRange"]:checked');
          quoteData.flightHours = fhVal ? parseFloat(fhVal) : null;
          quoteData.flightHoursRange = fhRangeSelected ? fhRangeSelected.value : null;
          break;
        }
        case 5: updateBatteriesData(); break;
        case 6: quoteData.unbound = form.querySelector('input[name="unbound"]:checked').value; break;
        case 7:
          quoteData.damage = form.querySelector('input[name="damage"]:checked').value;
          quoteData.damageDescription = form.elements["damageDescription"]?form.elements["damageDescription"].value.trim():"";
          break;
        case 8:
          // Save package contents status
          const contents = {};
          Array.from(form.querySelectorAll('[name^="packageContents-"]')).forEach(input=>{
            contents[input.name] = input.value;
          });
          quoteData.packageContents = contents; break;
        case 9:
          quoteData.droneSerial = form.elements["droneSerial"].value.trim();
          quoteData.controllerSerial = form.elements["controllerSerial"].value.trim(); break;
        case 10:
          // Photos handled by file input, no data extraction here for now
          break;
        case 12:
          ["fullName","email","phone","addressLine1","city","county","postcode"].forEach(field=>{
            quoteData[field] = form.elements[field].value.trim();
          });
          quoteData.legalRight = form.querySelector('input[name="legalRight"]:checked').value;
          break;
      }
      if(currentStep < steps.length-1){
        showStep(currentStep+1);
      }
    }
    if(e.target.classList.contains("btn-back")){
      e.preventDefault();
      if(currentStep>0) showStep(currentStep-1);
    }
    if(e.target.id === "add-battery-btn"){
      e.preventDefault();
      addBattery();
    }
  });

  // Damage text toggle
  form.querySelectorAll('input[name="damage"]').forEach(radio=>{
    radio.addEventListener("change", (e)=>{
      const damageDetails = document.getElementById("damage-details");
      if(e.target.value === "yes"){
        damageDetails.hidden = false;
        damageDetails.querySelector("textarea").setAttribute("required", "required");
      } else {
        damageDetails.hidden = true;
        damageDetails.querySelector("textarea").removeAttribute("required");
      }
    });
  });

  // Populate package contents dynamically on Step 9 when it’s shown
  function populatePackageContents(){
    const container = document.getElementById("package-contents-list");
    container.innerHTML = "";
    const contents = [
      "Drone", "Controller", "Battery 1", "Battery 2", "Battery 3", "Charging hub",
      "Bag", "Propellers", "Power supply", "Cables", "Other accessories"
    ];
    contents.forEach((item,i)=>{
      const div = document.createElement("div");
      div.innerHTML = `
        <label for="packageContents-${i}">${item}</label>
        <select id="packageContents-${i}" name="packageContents-${i}" required aria-required="true">
          <option value="">-- Select status --</option>
          <option value="present">Present</option>
          <option value="missing">Missing</option>
          <option value="additional">Additional</option>
        </select>
      `;
      container.appendChild(div);
    });
  }

  // Update package contents when entering step 9
  const observer = new MutationObserver(() => {
    if(current
