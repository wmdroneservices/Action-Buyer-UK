document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!category || !manufacturer || !model) return;

  const catalog = {
    drone: {"DJI":[["mini","DJI Mini"],["mini-2","DJI Mini 2"],["mini-3","DJI Mini 3"],["mini-3-pro","DJI Mini 3 Pro"],["mini-4-pro","DJI Mini 4 Pro"],["mini-5-pro","DJI Mini 5 Pro"],["neo","DJI Neo"],["neo-2","DJI Neo 2"],["flip","DJI Flip"],["air-2","DJI Air 2"],["air-2s","DJI Air 2S"],["air-3","DJI Air 3"],["air-3s","DJI Air 3S"],["mavic-2-pro","DJI Mavic 2 Pro"],["mavic-2-zoom","DJI Mavic 2 Zoom"],["mavic-3","DJI Mavic 3"],["mavic-3-classic","DJI Mavic 3 Classic"],["mavic-3-pro","DJI Mavic 3 Pro"],["mavic-4-pro","DJI Mavic 4 Pro"],["fpv","DJI FPV"],["avata","DJI Avata"],["avata-2","DJI Avata 2"]],"Autel Robotics":[["evo-nano","Autel EVO Nano"],["evo-nano-plus","Autel EVO Nano+"],["evo-lite","Autel EVO Lite"],["evo-lite-plus","Autel EVO Lite+"],["evo-ii","Autel EVO II"],["evo-max-4t","Autel EVO Max 4T"]],"Parrot":[["anafi","Parrot ANAFI"],["anafi-ai","Parrot ANAFI Ai"],["anafi-usa","Parrot ANAFI USA"]],"Skydio":[["skydio-2","Skydio 2"],["skydio-2-plus","Skydio 2+"]],"Yuneec":[["mantis","Yuneec Mantis"],["typhoon-h","Yuneec Typhoon H"]],"FIMI":[["x8-mini","FIMI X8 Mini"],["x8-se","FIMI X8 SE"],["x8-pro","FIMI X8 Pro"]],"Potensic":[["atom","Potensic ATOM"],["atom-2","Potensic ATOM 2"]]},
    "action-camera": {"GoPro":[["hero13","GoPro HERO13 Black"],["hero12","GoPro HERO12 Black"],["hero11","GoPro HERO11 Black"],["hero10","GoPro HERO10 Black"],["hero9","GoPro HERO9 Black"],["hero-max","GoPro MAX"]],"DJI":[["osmo-action-5","DJI Osmo Action 5 Pro"],["osmo-action-4","DJI Osmo Action 4"],["osmo-action-3","DJI Osmo Action 3"]],"Insta360":[["x5","Insta360 X5"],["x4","Insta360 X4"],["x3","Insta360 X3"],["ace-pro-2","Insta360 Ace Pro 2"],["ace-pro","Insta360 Ace Pro"],["go-3s","Insta360 GO 3S"]],"AKASO":[["brave-8","AKASO Brave 8"],["brave-7","AKASO Brave 7 LE"]],"SJCAM":[["sj20","SJCAM SJ20"],["sj10-pro","SJCAM SJ10 Pro"]]},
    camera: {"Canon":[["eos-r5-ii","Canon EOS R5 Mark II"],["eos-r6-iii","Canon EOS R6 Mark III"],["eos-r8","Canon EOS R8"],["eos-r7","Canon EOS R7"],["eos-r50","Canon EOS R50"]],"Sony":[["a1-ii","Sony Alpha 1 II"],["a7-iv","Sony Alpha 7 IV"],["a7c-ii","Sony Alpha 7C II"],["a6700","Sony Alpha 6700"]],"Nikon":[["z8","Nikon Z8"],["z6-iii","Nikon Z6 III"],["z5-ii","Nikon Z5 II"],["z50-ii","Nikon Z50 II"]],"Fujifilm":[["x-t5","Fujifilm X-T5"],["x-t50","Fujifilm X-T50"],["x-s20","Fujifilm X-S20"],["x-e5","Fujifilm X-E5"],["x-m5","Fujifilm X-M5"]],"Panasonic":[["s5-ii","Panasonic Lumix S5II"],["s5-iix","Panasonic Lumix S5IIX"],["gh7","Panasonic Lumix GH7"]],"OM System":[["om-1-ii","OM-1 Mark II"],["om-5","OM-5"]],"Leica":[["q3","Leica Q3"],["q3-43","Leica Q3 43"],["sl3","Leica SL3"]],"Blackmagic Design":[["pocket-6k","Blackmagic Pocket Cinema Camera 6K"],["pocket-6k-g2","Blackmagic Pocket Cinema Camera 6K G2"],["pyxis-6k","Blackmagic PYXIS 6K"]]},
    lens: {"Canon":[["rf-24-70","Canon RF 24-70mm"],["rf-70-200","Canon RF 70-200mm"]],"Sony":[["fe-24-70","Sony FE 24-70mm"],["fe-70-200","Sony FE 70-200mm"]],"Nikon":[["z-24-70","NIKKOR Z 24-70mm"],["z-70-200","NIKKOR Z 70-200mm"]],"Sigma":[["24-70-art","Sigma 24-70mm Art"],["70-200-sport","Sigma 70-200mm Sports"]],"Tamron":[["28-75","Tamron 28-75mm"],["70-180","Tamron 70-180mm"]]},
    accessory: {
      "DJI":[["rc-2","DJI RC 2"],["rc-n3","DJI RC-N3"],["battery-mini-5","DJI Mini 5 Pro Intelligent Flight Battery"],["battery-mini-4","DJI Mini 4 Pro Intelligent Flight Battery"],["charging-hub","DJI Charging Hub"],["power-adapter","DJI USB-C Power Adapter"]],
      "Autel Robotics":[["evo-battery","Autel EVO Intelligent Battery"],["evo-charger","Autel EVO Charger"],["evo-case","Autel EVO Carry Case"]],
      "Parrot":[["anafi-battery","Parrot ANAFI Smart Battery"],["anafi-charger","Parrot ANAFI Charger"],["anafi-case","Parrot ANAFI Carry Case"]],
      "GoPro":[["hero-enduro","GoPro Enduro Battery"],["hero-charger","GoPro Dual Battery Charger"],["media-mod","GoPro Media Mod"],["max-lens","GoPro Max Lens Mod"],["protective-case","GoPro Protective Case"]],
      "Canon":[["lp-e6nh","Canon LP-E6NH Battery"],["lp-e6p","Canon LP-E6P Battery"],["lc-e6e","Canon LC-E6E Charger"],["bg-r20","Canon BG-R20 Battery Grip"]],
      "Sony":[["np-fz100","Sony NP-FZ100 Battery"],["bc-qz1","Sony BC-QZ1 Charger"],["vg-c4em","Sony VG-C4EM Vertical Grip"]],
      "Nikon":[["en-el15c","Nikon EN-EL15c Battery"],["mh-25a","Nikon MH-25a Charger"],["mb-n12","Nikon MB-N12 Battery Pack"]],
      "Fujifilm":[["np-w235","Fujifilm NP-W235 Battery"],["bc-w235","Fujifilm BC-W235 Charger"],["mhg-xpro3","Fujifilm MHG-XPRO3 Grip"]],
      "Panasonic":[["dmw-blk22","Panasonic DMW-BLK22 Battery"],["dmw-bltc15","Panasonic Battery Charger"],["dmw-bgs5","Panasonic DMW-BGS5 Grip"]],
      "Insta360":[["x-series-battery","Insta360 X-Series Battery"],["quick-reader","Insta360 Quick Reader"],["x-series-case","Insta360 X-Series Carry Case"]],
      "Manfrotto":[["tripod","Manfrotto Tripod"],["head","Manfrotto Video Head"],["bag","Manfrotto Camera Bag"]],
      "RØDE":[["wireless-pro","RØDE Wireless PRO"],["videomic","RØDE VideoMic"],["charging-case","RØDE Charging Case"]]
    }
  };

  window.gearCatalogue = catalog;
  const categories = [["drone","Drone"],["action-camera","Action Camera"],["camera","Camera"],["lens","Camera Lens"],["accessory","Accessory"]];
  category.innerHTML = '<option value="">-- Select equipment type --</option>' + categories.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>';}).join("");
  function reset(s,p){s.innerHTML='<option value="">'+p+'</option>';}
  function manufacturers(){reset(manufacturer,"-- Select manufacturer --");reset(model,"-- Select a model --");manufacturer.disabled=true;model.disabled=true;const data=catalog[category.value];if(!data)return;Object.keys(data).forEach(function(name){const o=document.createElement("option");o.value=name;o.textContent=name;manufacturer.appendChild(o);});manufacturer.disabled=false;}
  function models(){reset(model,"-- Select a model --");model.disabled=true;const data=catalog[category.value],list=data&&data[manufacturer.value];if(!list)return;list.forEach(function(item){const o=document.createElement("option");o.value=item[0];o.textContent=item[1];model.appendChild(o);});model.disabled=false;}
  category.addEventListener("change",manufacturers);
  manufacturer.addEventListener("change",models);
});
