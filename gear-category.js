document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!category || !manufacturer || !model) return;

  const catalog = {
    drone: {
      "DJI":[["mini","DJI Mini"],["mini-2","DJI Mini 2"],["mini-2-se","DJI Mini 2 SE"],["mini-3","DJI Mini 3"],["mini-3-pro","DJI Mini 3 Pro"],["mini-4k","DJI Mini 4K"],["mini-4-pro","DJI Mini 4 Pro"],["mini-5-pro","DJI Mini 5 Pro"],["neo","DJI Neo"],["neo-2","DJI Neo 2"],["flip","DJI Flip"],["air-2","DJI Air 2"],["air-2s","DJI Air 2S"],["air-3","DJI Air 3"],["air-3s","DJI Air 3S"],["mavic-2-pro","DJI Mavic 2 Pro"],["mavic-2-zoom","DJI Mavic 2 Zoom"],["mavic-3","DJI Mavic 3"],["mavic-3-classic","DJI Mavic 3 Classic"],["mavic-3-pro","DJI Mavic 3 Pro"],["mavic-4-pro","DJI Mavic 4 Pro"],["fpv","DJI FPV"],["avata","DJI Avata"],["avata-2","DJI Avata 2"],["avata-360","DJI Avata 360"]],
      "Autel Robotics":[["evo-nano","Autel EVO Nano"],["evo-nano-plus","Autel EVO Nano+"],["evo-lite","Autel EVO Lite"],["evo-lite-plus","Autel EVO Lite+"],["evo-ii","Autel EVO II"],["evo-max-4t","Autel EVO Max 4T"]],
      "Parrot":[["anafi","Parrot ANAFI"],["anafi-ai","Parrot ANAFI Ai"],["anafi-usa","Parrot ANAFI USA"]],
      "Skydio":[["skydio-2","Skydio 2"],["skydio-2-plus","Skydio 2+"]],
      "Yuneec":[["mantis","Yuneec Mantis"],["typhoon-h","Yuneec Typhoon H"]],
      "FIMI":[["x8-mini","FIMI X8 Mini"],["x8-se","FIMI X8 SE"],["x8-pro","FIMI X8 Pro"]],
      "Potensic":[["atom","Potensic ATOM"],["atom-2","Potensic ATOM 2"]]
    },
    "action-camera": {
      "GoPro":[["hero13","GoPro HERO13 Black"],["hero12","GoPro HERO12 Black"],["hero11","GoPro HERO11 Black"],["hero10","GoPro HERO10 Black"],["hero9","GoPro HERO9 Black"],["hero-max","GoPro MAX"]],
      "DJI":[["osmo-action-5","DJI Osmo Action 5 Pro"],["osmo-action-4","DJI Osmo Action 4"],["osmo-action-3","DJI Osmo Action 3"]],
      "Insta360":[["x5","Insta360 X5"],["x4","Insta360 X4"],["x3","Insta360 X3"],["ace-pro-2","Insta360 Ace Pro 2"],["ace-pro","Insta360 Ace Pro"],["go-3s","Insta360 GO 3S"]],
      "AKASO":[["brave-8","AKASO Brave 8"],["brave-7","AKASO Brave 7 LE"]],
      "SJCAM":[["sj20","SJCAM SJ20"],["sj10-pro","SJCAM SJ10 Pro"]]
    },
    camera: {
      "Canon":[["eos-r5-ii","Canon EOS R5 Mark II"],["eos-r6-iii","Canon EOS R6 Mark III"],["eos-r8","Canon EOS R8"],["eos-r7","Canon EOS R7"],["eos-r50","Canon EOS R50"]],
      "Sony":[["a1-ii","Sony Alpha 1 II"],["a7-iv","Sony Alpha 7 IV"],["a7c-ii","Sony Alpha 7C II"],["a6700","Sony Alpha 6700"]],
      "Nikon":[["z8","Nikon Z8"],["z6-iii","Nikon Z6 III"],["z5-ii","Nikon Z5 II"],["z50-ii","Nikon Z50 II"]],
      "Fujifilm":[["x-t5","Fujifilm X-T5"],["x-t50","Fujifilm X-T50"],["x-s20","Fujifilm X-S20"],["x-e5","Fujifilm X-E5"],["x-m5","Fujifilm X-M5"]],
      "Panasonic":[["s5-ii","Panasonic Lumix S5II"],["s5-iix","Panasonic Lumix S5IIX"],["gh7","Panasonic Lumix GH7"]],
      "OM System":[["om-1-ii","OM-1 Mark II"],["om-5","OM-5"]],
      "Leica":[["q3","Leica Q3"],["q3-43","Leica Q3 43"],["sl3","Leica SL3"]],
      "Blackmagic Design":[["pocket-6k","Blackmagic Pocket Cinema Camera 6K"],["pocket-6k-g2","Blackmagic Pocket Cinema Camera 6K G2"],["pyxis-6k","Blackmagic PYXIS 6K"]]
    },
    lens: {
      "Canon":[["rf-24-70","Canon RF 24-70mm"],["rf-70-200","Canon RF 70-200mm"]],
      "Sony":[["fe-24-70","Sony FE 24-70mm"],["fe-70-200","Sony FE 70-200mm"]],
      "Nikon":[["z-24-70","NIKKOR Z 24-70mm"],["z-70-200","NIKKOR Z 70-200mm"]],
      "Sigma":[["24-70-art","Sigma 24-70mm Art"],["70-200-sport","Sigma 70-200mm Sports"]],
      "Tamron":[["28-75","Tamron 28-75mm"],["70-180","Tamron 70-180mm"]]
    },
    accessory: {
      "DJI":[
        ["charging-hub","DJI Battery Charging Hub"],
        ["power-adapter","DJI USB-C Power Adapter"],
        ["charger","DJI Charger / Power Adapter"],
        ["gimbal-camera","DJI Gimbal Camera / Zenmuse Camera"],
        ["hard-case","DJI Hard Case / Protective Case"],
        ["storage-cover","DJI Gimbal / Storage Cover"],
        ["controller-cover","DJI Controller Protective Cover"],
        ["propellers","DJI Genuine Replacement Propellers"],
        ["propeller-guards","DJI Propeller Guards"],
        ["nd-filters","DJI ND Filter Set"],
        ["gimbal-protector","DJI Gimbal Protector"],
        ["landing-gear","DJI Landing Gear / Extended Landing Supports"],
        ["camera-expansion-accessory","DJI Camera / Gimbal Expansion Accessory"]
      ],
      "Autel Robotics":[["evo-charger","Autel EVO Charger"],["evo-case","Autel EVO Carry Case"],["evo-propellers","Autel Genuine Replacement Propellers"],["evo-nd-filters","Autel ND Filter Set"]],
      "Parrot":[["anafi-charger","Parrot ANAFI Charger"],["anafi-case","Parrot ANAFI Carry Case"],["anafi-propellers","Parrot Genuine Replacement Propellers"]],
      "GoPro":[["hero-charger","GoPro Dual Battery Charger"],["media-mod","GoPro Media Mod"],["max-lens","GoPro Max Lens Mod"],["protective-case","GoPro Protective Case"],["volta","GoPro Volta Battery Grip"]],
      "Canon":[["lc-e6e","Canon LC-E6E Charger"],["bg-r20","Canon BG-R20 Battery Grip"],["speedlite","Canon Speedlite Flash"],["remote-control","Canon Remote Control"],["camera-case","Canon Protective Camera Case"]],
      "Sony":[["bc-qz1","Sony BC-QZ1 Charger"],["vg-c4em","Sony VG-C4EM Vertical Grip"],["remote-control","Sony Remote Commander"],["camera-case","Sony Protective Camera Case"]],
      "Nikon":[["mh-25a","Nikon MH-25a Charger"],["mb-n12","Nikon MB-N12 Battery Pack"],["speedlight","Nikon Speedlight Flash"],["remote-control","Nikon Remote Control"],["camera-case","Nikon Protective Camera Case"]],
      "Fujifilm":[["bc-w235","Fujifilm BC-W235 Charger"],["grip","Fujifilm Battery Grip"],["flash","Fujifilm Flash"],["remote-control","Fujifilm Remote Control"],["camera-case","Fujifilm Protective Camera Case"]],
      "Panasonic":[["charger","Panasonic Battery Charger"],["dmw-bgs5","Panasonic Battery Grip"],["flash","Panasonic Flash"],["remote-control","Panasonic Remote Control"],["camera-case","Panasonic Protective Camera Case"]],
      "Insta360":[["quick-reader","Insta360 Quick Reader"],["x-series-case","Insta360 X-Series Carry Case"],["gimbal","Insta360 Gimbal / Stabilizer"],["lens-guards","Insta360 Lens Guards"],["charging-hub","Insta360 Charging Hub"]],
      "Manfrotto":[["tripod","Manfrotto Tripod"],["head","Manfrotto Video Head"],["bag","Manfrotto Professional Camera Bag"],["monopod","Manfrotto Monopod"]],
      "RØDE":[["wireless-pro","RØDE Wireless PRO"],["videomic","RØDE VideoMic"],["charging-case","RØDE Charging Case"]]
    },
    "dji-controller": {"DJI":[["rc-n1","DJI RC-N1"],["rc-n2","DJI RC-N2"],["rc-n3","DJI RC-N3"],["rc","DJI RC"],["rc-2","DJI RC 2"],["rc-pro","DJI RC Pro"],["rc-plus","DJI RC Plus"],["smart-controller","DJI Smart Controller"],["fpv-remote","DJI FPV Remote Controller"],["fpv-remote-2","DJI FPV Remote Controller 2"],["fpv-remote-3","DJI FPV Remote Controller 3"],["motion-controller","DJI Motion Controller"],["rc-motion-2","DJI RC Motion 2"],["rc-motion-3","DJI RC Motion 3"]]},
    "dji-battery": {"DJI":[["neo-battery","DJI Neo Intelligent Flight Battery"],["mini-2-mini-4k-mini-se-battery","DJI Mini 2 / Mini 4K / Mini SE Intelligent Flight Battery"],["mini-3-mini-4-pro-battery","DJI Mini 3 / Mini 4 Pro Intelligent Flight Battery"],["air-3-air-3s-battery","DJI Air 3 / Air 3S Intelligent Flight Battery"],["mavic-3-battery","DJI Mavic 3 Intelligent Flight Battery"],["avata-2-battery","DJI Avata 2 Intelligent Flight Battery"],["fpv-battery","DJI FPV Intelligent Flight Battery"],["tb65-battery","DJI TB65 Intelligent Battery"],["wb37-battery","DJI WB37 Intelligent Battery"]]}
  };

  window.gearCatalogue = catalog;
  const categories = [["drone","Drone"],["action-camera","Action Camera"],["camera","Camera"],["lens","Camera Lens"],["accessory","Accessory"],["dji-controller","DJI Controller"],["dji-battery","DJI Battery"]];
  category.innerHTML = '<option value="">-- Select equipment type --</option>' + categories.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>';}).join("");

  function reset(select, placeholder) { select.innerHTML = '<option value="">' + placeholder + '</option>'; }
  function manufacturers() {
    reset(manufacturer, "-- Select manufacturer --");
    reset(model, "-- Select a model --");
    manufacturer.disabled = true;
    model.disabled = true;
    const data = catalog[category.value];
    if (!data) return;
    Object.keys(data).forEach(function(name) {
      const option = document.createElement("option"); option.value = name; option.textContent = name; manufacturer.appendChild(option);
    });
    manufacturer.disabled = false;
    if (category.value === "dji-controller" || category.value === "dji-battery") {
      manufacturer.value = "DJI";
      manufacturer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  function models() {
    reset(model, "-- Select a model --"); model.disabled = true;
    const data = catalog[category.value], list = data && data[manufacturer.value];
    if (!list) return;
    list.forEach(function(item) { const option = document.createElement("option"); option.value = item[0]; option.textContent = item[1]; model.appendChild(option); });
    model.disabled = false;
  }
  category.addEventListener("change", manufacturers);
  manufacturer.addEventListener("change", models);
});
