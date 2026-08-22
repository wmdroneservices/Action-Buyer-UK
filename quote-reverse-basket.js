/* GearCashOut: single-source reverse shopping basket quote wizard. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const progress = document.getElementById("progress-indicator");
  if (!form || !progress) return;

  const catalog = {
    drone: {
      "DJI": [["mini","DJI Mini"],["mini-2","DJI Mini 2"],["mini-2-se","DJI Mini 2 SE"],["mini-3","DJI Mini 3"],["mini-3-pro","DJI Mini 3 Pro"],["mini-4k","DJI Mini 4K"],["mini-4-pro","DJI Mini 4 Pro"],["mini-5-pro","DJI Mini 5 Pro"],["neo","DJI Neo"],["neo-2","DJI Neo 2"],["flip","DJI Flip"],["air-2","DJI Air 2"],["air-2s","DJI Air 2S"],["air-3","DJI Air 3"],["air-3s","DJI Air 3S"],["mavic-2-pro","DJI Mavic 2 Pro"],["mavic-2-zoom","DJI Mavic 2 Zoom"],["mavic-3","DJI Mavic 3"],["mavic-3-classic","DJI Mavic 3 Classic"],["mavic-3-pro","DJI Mavic 3 Pro"],["mavic-4-pro","DJI Mavic 4 Pro"],["fpv","DJI FPV"],["avata","DJI Avata"],["avata-2","DJI Avata 2"],["avata-360","DJI Avata 360"]],
      "Autel Robotics": [["evo-nano","Autel EVO Nano"],["evo-nano-plus","Autel EVO Nano+"],["evo-lite","Autel EVO Lite"],["evo-lite-plus","Autel EVO Lite+"],["evo-ii","Autel EVO II"],["evo-max-4t","Autel EVO Max 4T"]],
      "Parrot": [["anafi","Parrot ANAFI"],["anafi-ai","Parrot ANAFI Ai"],["anafi-usa","Parrot ANAFI USA"]],
      "Skydio": [["skydio-2","Skydio 2"],["skydio-2-plus","Skydio 2+"]],
      "Yuneec": [["mantis","Yuneec Mantis"],["typhoon-h","Yuneec Typhoon H"]],
      "FIMI": [["x8-mini","FIMI X8 Mini"],["x8-se","FIMI X8 SE"],["x8-pro","FIMI X8 Pro"]],
      "Potensic": [["atom","Potensic ATOM"],["atom-2","Potensic ATOM 2"]]
    },
    "action-camera": {
      "GoPro": [["hero13","GoPro HERO13 Black"],["hero12","GoPro HERO12 Black"],["hero11","GoPro HERO11 Black"],["hero10","GoPro HERO10 Black"],["hero9","GoPro HERO9 Black"],["hero-max","GoPro MAX"]],
      "DJI": [["osmo-action-5","DJI Osmo Action 5 Pro"],["osmo-action-4","DJI Osmo Action 4"],["osmo-action-3","DJI Osmo Action 3"]],
      "Insta360": [["x5","Insta360 X5"],["x4","Insta360 X4"],["x3","Insta360 X3"],["ace-pro-2","Insta360 Ace Pro 2"],["ace-pro","Insta360 Ace Pro"],["go-3s","Insta360 GO 3S"]]
    },
    camera: {
      "Canon": [["eos-r5-ii","Canon EOS R5 Mark II"],["eos-r6-iii","Canon EOS R6 Mark III"],["eos-r8","Canon EOS R8"],["eos-r7","Canon EOS R7"],["eos-r50","Canon EOS R50"]],
      "Sony": [["a1-ii","Sony Alpha 1 II"],["a7-iv","Sony Alpha 7 IV"],["a7c-ii","Sony Alpha 7C II"],["a6700","Sony Alpha 6700"]],
      "Nikon": [["z8","Nikon Z8"],["z6-iii","Nikon Z6 III"],["z5-ii","Nikon Z5 II"],["z50-ii","Nikon Z50 II"]],
      "Fujifilm": [["x-t5","Fujifilm X-T5"],["x-t50","Fujifilm X-T50"],["x-s20","Fujifilm X-S20"],["x-e5","Fujifilm X-E5"],["x-m5","Fujifilm X-M5"]],
      "Panasonic": [["s5-ii","Panasonic Lumix S5II"],["s5-iix","Panasonic Lumix S5IIX"],["gh7","Panasonic Lumix GH7"]]
    },
    lens: {
      "Canon": [["rf-24-70","Canon RF 24-70mm"],["rf-70-200","Canon RF 70-200mm"]],
      "Sony": [["fe-24-70","Sony FE 24-70mm"],["fe-70-200","Sony FE 70-200mm"]],
      "Nikon": [["z-24-70","NIKKOR Z 24-70mm"],["z-70-200","NIKKOR Z 70-200mm"]],
      "Sigma": [["24-70-art","Sigma 24-70mm Art"],["70-200-sport","Sigma 70-200mm Sports"]],
      "Tamron": [["28-75","Tamron 28-75mm"],["70-180","Tamron 70-180mm"]]
    },
    "accessory": {
      "DJI": [["charging-hub","DJI Battery Charging Hub"],["power-adapter","DJI USB-C Power Adapter"],["charger","DJI Charger / Power Adapter"],["hard-case","DJI Hard Case / Protective Case"],["propellers","DJI Genuine Replacement Propellers"],["nd-filters","DJI ND Filter Set"],["controller-cover","DJI Controller Protective Cover"]],
      "GoPro": [["media-mod","GoPro Media Mod"],["volta","GoPro Volta Battery Grip"],["protective-case","GoPro Protective Case"]],
      "Canon": [["lc-e6e","Canon LC-E6E Charger"],["bg-r20","Canon BG-R20 Battery Grip"],["speedlite","Canon Speedlite Flash"]],
      "Sony": [["bc-qz1","Sony BC-QZ1 Charger"],["vg-c4em","Sony VG-C4EM Vertical Grip"],["camera-case","Sony Protective Camera Case"]]
    },
    "dji-controller": { "DJI": [["rc-n1","DJI RC-N1"],["rc-n2","DJI RC-N2"],["rc-n3","DJI RC-N3"],["rc","DJI RC"],["rc-2","DJI RC 2"],["rc-pro","DJI RC Pro"],["rc-plus","DJI RC Plus"],["smart-controller","DJI Smart Controller"],["fpv-remote-2","DJI FPV Remote Controller 2"],["motion-controller","DJI Motion Controller"]] },
    "dji-battery": { "DJI": [["neo-battery","DJI Neo Intelligent Flight Battery"],["mini-2-mini-4k-mini-se-battery","DJI Mini 2 / Mini 4K / Mini SE Intelligent Flight Battery"],["mini-3-mini-4-pro-battery","DJI Mini 3 / Mini 4 Pro Intelligent Flight Battery"],["air-3-air-3s-battery","DJI Air 3 / Air 3S Intelligent Flight Battery"],["mavic-3-battery","DJI Mavic 3 Intelligent Flight Battery"],["avata-2-battery","DJI Avata 2 Intelligent Flight Battery"],["tb65-battery","DJI TB65 Intelligent Battery"],["wb37-battery","DJI WB37 Intelligent Battery"]] }
  };

  const categoryLabels = {drone:"Drone","action-camera":"Action Camera",camera:"Camera",lens:"Camera Lens",accessory:"Accessory","dji-controller":"DJI Controller","dji-battery":"DJI Battery"};
  const dronePackages = {
    "mini-5-pro": {"drone-only":["Drone only",1],"standard-rc-n3":["Standard + RC-N3",1],"fly-more-rc-n3":["Fly More Combo + RC-N3",3],"fly-more-rc-2":["Fly More Combo + RC 2",3],"fly-more-plus-rc-2":["Fly More Combo Plus + RC 2",3]},
    "mini-4-pro": {"drone-only":["Drone only",1],"standard-rc-n2":["Standard + RC-N2",1],"standard-rc-2":["Standard + RC 2",1],"fly-more-rc-n2":["Fly More Combo + RC-N2",3],"fly-more-rc-2":["Fly More Combo + RC 2",3]},
    "mini-3-pro": {"drone-only":["Drone only",1],"drone-rc-n1":["Drone + RC-N1",1],"drone-dji-rc":["Drone + DJI RC",1],"fly-more-rc-n1":["Fly More Combo + RC-N1",3],"fly-more-dji-rc":["Fly More Combo + DJI RC",3]},
    "mini-3": {"drone-only":["Drone only",1],"standard-rc-n1":["Standard + RC-N1",1],"fly-more-rc-n1":["Fly More Combo + RC-N1",3]},
    "mini-2": {"drone-only":["Drone only",1],"standard-rc-n1":["Standard + RC-N1",1],"fly-more":["Fly More Combo",3]},
    "neo": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "neo-2": {"standard":["Standard Package",1],"fly-more":["Fly More Combo",3]},
    "flip": {"standard-rc-n3":["Standard + RC-N3",1],"fly-more-rc-n3":["Fly More Combo + RC-N3",3],"fly-more-rc-2":["Fly More Combo + RC 2",3]},
    "air-2": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "air-2s": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "air-3": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "air-3s": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "mavic-2-pro": {"drone-only":["Drone only",1],"standard":["Standard Package",1],"fly-more":["Fly More Combo",3]},
    "mavic-2-zoom": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "mavic-3": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "mavic-3-classic": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "mavic-3-pro": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]},
    "mavic-4-pro": {"drone-only":["drone-only","Drone only",1],"fly-more":["Fly More Combo",3]},
    "fpv": {"drone-only":["Drone only",1],"fly-smart":["Fly Smart Combo",1]},
    "avata": {"drone-only":["Drone only",1],"fly-smart":["Fly Smart Combo",2],"pro-view":["Pro-View Combo",2],"explorer":["Explorer Combo",2]},
    "avata-2": {"drone-only":["Drone only",1],"fly-more":["Fly More Combo",3]}
  };
  const genericPackages = {"action-camera":{"camera-only":"Camera Only","standard-package":"Standard Package","complete":"Complete Package"},camera:{"body-only":"Body Only","standard-package":"Standard Package / Kit","kit":"Kit / Lens Bundle"},lens:{"lens-only":"Lens Only","with-case":"Lens + Case / Pouch","complete":"Complete Package"},accessory:{"item-only":"Item Only","with-original-packaging":"With Original Packaging","complete-package":"Complete Package"}};
  const automatic = {model:"mini-5-pro",package:"fly-more-rc-2",condition:"factory-sealed",amount:500};
  const basketKey = "gearCashOutQuoteBasket";
  let item = {};
  let currentFiles = [];
  let currentStep = 1;
  let flow = [];

  const el = id => document.getElementById(id);
  const val = id => String(el(id)?.value || "").trim();
  const checked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const selectedText = id => { const s=el(id); return s?.selectedIndex>=0 ? s.options[s.selectedIndex].textContent.trim() : ""; };
  const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const money = v => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v));
  function readBasket(){ try { const b=JSON.parse(localStorage.getItem(basketKey)||"[]"); return Array.isArray(b)?b:[]; } catch(_) { return []; } }
  function writeBasket(b){ try { localStorage.setItem(basketKey,JSON.stringify(b)); } catch(_) {} }
  function filesStore(){ if(!Array.isArray(window.__gcoMultiItemFiles)) window.__gcoMultiItemFiles=[]; return window.__gcoMultiItemFiles; }
  window.gearCashOutGetMultiItemBasket = readBasket;
  window.gearCashOutGetMultiItemFiles = () => filesStore();
  function packageMap(){ if(item.category === "drone") return dronePackages[item.model] || {"drone-only":["Drone only",1]}; return genericPackages[item.category] || {}; }
  function includedBatteryCount(){ const p=packageMap()[item.package]; return Array.isArray(p)?Number(p[1]||0):0; }
  function buildFlow(){ flow=[1,2,3]; if(Object.keys(packageMap()).length) flow.push(4); flow.push(5,6); if(item.category === "drone") flow.push(7,8); flow.push(9,10,11,12,13,14); return flow; }
  function labels(){ const map={1:"Category",2:"Manufacturer",3:"Model",4:"Package",5:"Condition",6:"Usage",7:"Batteries",8:"Account Status",9:"Damage",10:"Contents",11:"Photos",12:"Your Items",13:"Customer Details",14:"Submitted"}; progress.innerHTML=flow.map((n,i)=>`<li class="progress-step${n===currentStep?" active":""}" data-progress-step="${n}">${i+1}. ${map[n]}</li>`).join(""); }
  function show(n){ currentStep=n; form.querySelectorAll(".wizard-step").forEach(s=>s.hidden=Number(s.dataset.step)!==n); labels(); window.scrollTo({top:0,behavior:"smooth"}); }
  function setSelect(select, options, placeholder){ select.innerHTML=`<option value="">${esc(placeholder)}</option>`; options.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;select.appendChild(o);}); select.disabled=options.length===0; }
  function populateManufacturers(){ const data=catalog[val("gear-category")]||{}; setSelect(el("gear-manufacturer"),Object.keys(data).map(x=>[x,x]),"-- Select manufacturer --"); setSelect(el("dji-model"),[],"-- Select a model --"); }
  function populateModels(){ const data=catalog[val("gear-category")]||{}; const list=data[val("gear-manufacturer")]||[]; setSelect(el("dji-model"),list,"-- Select a model --"); }
  function populatePackages(){ const options=packageMap(); const rows=Object.entries(options).map(([id,v])=>[id,Array.isArray(v)?v[0]:v]); setSelect(el("package-select"),rows,"-- Select a package --"); }
  function renderBatteryStep(){ const c=el("batteries-container"); if(!c)return; const count=includedBatteryCount(); if(!count){c.innerHTML='<p>This item does not have a package battery allowance.</p>';return;} c.innerHTML=`<p>The selected package contains <strong>${count}</strong> battery${count===1?"":"ies"}. Enter the cycle count for each battery if known.</p>`+Array.from({length:count},(_,i)=>`<div class="battery-entry"><h4>Battery ${i+1}</h4><label>Battery type<select class="battery-type"><option value="standard">Standard / Intelligent Flight Battery</option><option value="plus">Plus / Extended Battery</option></select></label><label>Charge cycles<input type="number" class="battery-cycles" min="0" step="1" value="0"></label></div>`).join(""); }
  function renderContents(){ const c=el("package-contents-list"); if(!c)return; const ids=item.category==="drone"?[{id:"drone",name:"Drone / Aircraft"},{id:"controller",name:"Controller"},{id:"charging-hub",name:"Charging Hub"},{id:"bag",name:"Bag / Case"},{id:"propellers",name:"Propellers"},{id:"power-supply",name:"Power Supply"},{id:"cables",name:"Cables"}]:[{id:"main-item",name:"Main Item"},{id:"charger",name:"Charger / Power Supply"},{id:"cable",name:"Cable / Lead"},{id:"box",name:"Original Box / Packaging"},{id:"case",name:"Case / Bag"}]; const batteries=includedBatteryCount(); if(item.category==="drone")for(let i=1;i<=batteries;i++)ids.splice(2,0,{id:`battery-${i}`,name:`Battery ${i}`}); c.innerHTML=ids.map(x=>`<label>${esc(x.name)}<select class="package-content-select" data-content-id="${esc(x.id)}"><option value="">-- Select status --</option><option value="present">Present</option><option value="missing">Missing</option></select></label>`).join(""); }
  function calculateAmount(){ return item.model===automatic.model && item.package===automatic.package && item.condition===automatic.condition ? automatic.amount : null; }
  function saveCurrentItem(){ const contents={};document.querySelectorAll(".package-content-select").forEach(s=>contents[s.dataset.contentId]=s.value); item.packageContents=contents; item.batteries=Array.from(document.querySelectorAll(".battery-entry")).map(r=>({type:r.querySelector(".battery-type")?.value||"standard",cycles:Number(r.querySelector(".battery-cycles")?.value||0)})); item.droneSerial=val("drone-serial-number"); item.controllerSerial=val("controller-serial-number"); item.legalRight=checked("legalRight"); item.photos=[]; const amount=calculateAmount(); item.valuation=amount===null?"manual":"automatic"; item.amount=amount; const basket=readBasket();basket.push(item);writeBasket(basket);filesStore().push(currentFiles.slice()); }
  function renderReview(){ const basket=readBasket(); const summary=el("basket-summary"); let total=0; const rows=basket.map((x,i)=>{const auto=x.valuation==="automatic"&&Number.isFinite(Number(x.amount));if(auto)total+=Number(x.amount);return `<li><strong>${i+1}. ${esc(x.modelName||x.itemName)}</strong><br><span>${esc(x.manufacturerName||x.manufacturer||"")}${x.packageName?` — ${esc(x.packageName)}`:""}</span><br>${auto?`<strong>${money(x.amount)}</strong>`:"<strong>Manual valuation after review</strong>"}</li>`}).join(""); summary.innerHTML=`<h3>Your Items</h3><p>This works like a shopping basket in reverse: add the equipment you want to sell and we will value the basket.</p><ol>${rows}</ol><p><strong>Automatic offer total:</strong> ${money(total)}</p><div class="navigation-buttons"><button type="button" class="btn btn-secondary" id="add-another-item">Add Another Item</button><button type="button" class="btn btn-next">Continue With This Quote</button></div>`; }
  function resetForNewItem(){ item={};currentFiles=[];form.querySelectorAll('input[type="text"],input[type="number"],textarea').forEach(x=>{if(!["full-name","email-address","phone-number","address-line-1","address-line-2","city","county","postcode"].includes(x.id))x.value="";});form.querySelectorAll('input[type="radio"]').forEach(x=>x.checked=false);if(el("photo-uploads"))el("photo-uploads").value="";el("gear-category").value="";populateManufacturers();setSelect(el("gear-manufacturer"),[],"-- Select manufacturer --");setSelect(el("dji-model"),[],"-- Select a model --");setSelect(el("package-select"),[],"-- Select a package --");flow=buildFlow();show(1); }
  function validate(){ if(currentStep===1&&!val("gear-category")){alert("Please select what you are selling.");return false;} if(currentStep===2&&!val("gear-manufacturer")){alert("Please select a manufacturer.");return false;} if(currentStep===3&&!val("dji-model")){alert("Please select a model.");return false;} if(currentStep===4&&!val("package-select")){alert("Please select the package.");return false;} if(currentStep===5&&!checked("condition")){alert("Please select the condition.");return false;} if(currentStep===6&&!val("flight-hours")&&!checked("flightHoursRange")){alert("Please enter the usage information.");return false;} if(currentStep===8&&!checked("unbound")){alert("Please tell us the account status.");return false;} if(currentStep===9&&!checked("damage")){alert("Please tell us whether the equipment has damage.");return false;} if(currentStep===10){for(const s of document.querySelectorAll(".package-content-select")){if(!s.value){alert("Please mark every package item as Present or Missing.");return false;}}} if(currentStep===11){if(!el("photo-uploads")?.files?.length){alert("Please upload at least one photograph.");return false;}if(!checked("legalRight")){alert("Please confirm whether you have the legal right to sell this equipment.");return false;}} return true; }
  function collectItem(){ item.category=val("gear-category");item.categoryName=selectedText("gear-category");item.manufacturer=val("gear-manufacturer");item.manufacturerName=selectedText("gear-manufacturer");item.model=val("dji-model");item.modelName=selectedText("dji-model");item.package=val("package-select");item.packageName=selectedText("package-select");item.condition=checked("condition");item.flightHours=val("flight-hours");item.flightHoursRange=checked("flightHoursRange");item.unbound=checked("unbound");item.damage=checked("damage");item.damageDescription=val("damage-description");item.itemName=item.modelName;currentFiles=Array.from(el("photo-uploads")?.files||[]); }
  function next(){ if(!validate())return; if(currentStep===1){item.category=val("gear-category");item.categoryName=selectedText("gear-category");populateManufacturers();show(2);return;} if(currentStep===2){item.manufacturer=val("gear-manufacturer");item.manufacturerName=selectedText("gear-manufacturer");populateModels();show(3);return;} if(currentStep===3){item.model=val("dji-model");item.modelName=selectedText("dji-model");populatePackages();flow=buildFlow();show(Object.keys(packageMap()).length?4:5);return;} if(currentStep===4){item.package=val("package-select");item.packageName=selectedText("package-select");flow=buildFlow();show(5);return;} if(currentStep===5){item.condition=checked("condition");show(6);return;} if(currentStep===6){item.flightHours=val("flight-hours");item.flightHoursRange=checked("flightHoursRange");if(item.category==="drone"){renderBatteryStep();show(7);}else{renderContents();show(9);}return;} if(currentStep===7){show(8);return;} if(currentStep===8){item.unbound=checked("unbound");show(9);return;} if(currentStep===9){item.damage=checked("damage");item.damageDescription=val("damage-description");renderContents();show(10);return;} if(currentStep===10){show(11);return;} if(currentStep===11){collectItem();saveCurrentItem();renderReview();show(12);return;} if(currentStep===12){if(!readBasket().length){alert("Please add at least one item.");return;}show(13);return;} }
  function back(){const idx=flow.indexOf(currentStep);if(idx>0)show(flow[idx-1]);}
  form.addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;if(b.id==="add-another-item"){e.preventDefault();resetForNewItem();return;}if(b.classList.contains("btn-next")){e.preventDefault();next();return;}if(b.classList.contains("btn-back")){e.preventDefault();back();return;}});
  form.addEventListener("change",function(e){if(e.target.id==="gear-category")populateManufacturers();if(e.target.id==="gear-manufacturer")populateModels();if(e.target.id==="dji-model"){item.model=e.target.value;item.modelName=selectedText("dji-model");populatePackages();flow=buildFlow();}if(e.target.id==="package-select"){item.package=e.target.value;item.packageName=selectedText("package-select");}if(e.target.name==="damage")el("damage-details").hidden=e.target.value!=="yes";});
  window.gearCashOutReverseBasket={readBasket,writeBasket,filesStore,resetForNewItem};
  flow=buildFlow();labels();show(1);console.log("GearCashOut reverse basket wizard loaded: single controller, no legacy quote patches.");
});
