document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const category = document.getElementById("gear-category");
  const manufacturer = document.getElementById("gear-manufacturer");
  const model = document.getElementById("dji-model");
  if (!category || !manufacturer || !model) return;

  const catalog = {
    drone: {"DJI":[["mini","DJI Mini"],["mini-2","DJI Mini 2"],["mini-2-se","DJI Mini 2 SE"],["mini-3","DJI Mini 3"],["mini-3-pro","DJI Mini 3 Pro"],["mini-4k","DJI Mini 4K"],["mini-4-pro","DJI Mini 4 Pro"],["mini-5-pro","DJI Mini 5 Pro"],["neo","DJI Neo"],["neo-2","DJI Neo 2"],["flip","DJI Flip"],["air-2","DJI Air 2"],["air-2s","DJI Air 2S"],["air-3","DJI Air 3"],["air-3s","DJI Air 3S"],["mavic-2-pro","DJI Mavic 2 Pro"],["mavic-2-zoom","DJI Mavic 2 Zoom"],["mavic-3","DJI Mavic 3"],["mavic-3-classic","DJI Mavic 3 Classic"],["mavic-3-pro","DJI Mavic 3 Pro"],["mavic-4-pro","DJI Mavic 4 Pro"],["fpv","DJI FPV"],["avata","DJI Avata"],["avata-2","DJI Avata 2"],["avata-360","DJI Avata 360"]],"Autel Robotics":[["evo-nano","Autel EVO Nano"],["evo-nano-plus","Autel EVO Nano+"],["evo-lite","Autel EVO Lite"],["evo-lite-plus","Autel EVO Lite+"],["evo-ii","Autel EVO II"],["evo-max-4t","Autel EVO Max 4T"]],"Parrot":[["anafi","Parrot ANAFI"],["anafi-ai","Parrot ANAFI Ai"],["anafi-usa","Parrot ANAFI USA"]],"Skydio":[["skydio-2","Skydio 2"],["skydio-2-plus","Skydio 2+"]],"Yuneec":[["mantis","Yuneec Mantis"],["typhoon-h","Yuneec Typhoon H"]],"FIMI":[["x8-mini","FIMI X8 Mini"],["x8-se","FIMI X8 SE"],["x8-pro","FIMI X8 Pro"]],"Potensic":[["atom","Potensic ATOM"],["atom-2","Potensic ATOM 2"]]},
    "dji-controller": {"DJI":[["rc-n1","DJI RC-N1"],["rc-n2","DJI RC-N2"],["rc-n3","DJI RC-N3"],["rc","DJI RC"],["rc-2","DJI RC 2"],["rc-pro","DJI RC Pro"],["rc-plus","DJI RC Plus"],["smart-controller","DJI Smart Controller"],["fpv-remote","DJI FPV Remote Controller"],["fpv-remote-2","DJI FPV Remote Controller 2"],["fpv-remote-3","DJI FPV Remote Controller 3"],["motion-controller","DJI Motion Controller"],["rc-motion-2","DJI RC Motion 2"],["rc-motion-3","DJI RC Motion 3"]]},
    "dji-battery": {"DJI":[["neo-battery","DJI Neo Intelligent Flight Battery"],["mini-2-mini-4k-mini-se-battery","DJI Mini 2 / Mini 4K / Mini SE Intelligent Flight Battery"],["mini-3-mini-4-pro-battery","DJI Mini 3 / Mini 4 Pro Intelligent Flight Battery"],["air-3-air-3s-battery","DJI Air 3 / Air 3S Intelligent Flight Battery"],["mavic-3-battery","DJI Mavic 3 Intelligent Flight Battery"],["avata-2-battery","DJI Avata 2 Intelligent Flight Battery"],["fpv-battery","DJI FPV Intelligent Flight Battery"],["tb65-battery","DJI TB65 Intelligent Battery"],["wb37-battery","DJI WB37 Intelligent Battery"]]}
  };

  window.gearCatalogue = catalog;
  const categories = [["drone","Drone"],["dji-controller","DJI Controller"],["dji-battery","DJI Battery"]];
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
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      manufacturer.appendChild(option);
    });
    manufacturer.disabled = false;
    if (category.value === "dji-controller" || category.value === "dji-battery") {
      manufacturer.value = "DJI";
      manufacturer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function models() {
    reset(model, "-- Select a model --");
    model.disabled = true;
    const data = catalog[category.value];
    const list = data && data[manufacturer.value];
    if (!list) return;
    list.forEach(function(item) {
      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];
      model.appendChild(option);
    });
    model.disabled = false;
  }

  category.addEventListener("change", manufacturers);
  manufacturer.addEventListener("change", models);
});
