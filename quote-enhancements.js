/* GearCashOut quote enhancements
   - Adds category -> manufacturer -> model selection.
   - Keeps the existing DJI quote engine for verified DJI pricing.
   - Non-DJI categories continue through the wizard but correctly reach manual valuation.
   - Removes the customer-facing battery-entry page: package batteries are checked in Package Contents.
   - Adds a dedicated Additional Items section after Package Contents.
*/
(function () {
  "use strict";

  const EXTRA_VALUES = {
    battery: 30,
    controller: 50,
    hardCase: 25,
    charger: 10,
    chargingHub: 20,
    propellers: 5,
    smallAccessory: 2
  };

  const CATALOG = {
    "Drone": {
      "DJI": [
        ["mini-2", "DJI Mini 2"], ["mini-3", "DJI Mini 3"], ["mini-3-pro", "DJI Mini 3 Pro"],
        ["mini-4-pro", "DJI Mini 4 Pro"], ["mini-5-pro", "DJI Mini 5 Pro"], ["neo", "DJI Neo"], ["neo-2", "DJI Neo 2"],
        ["flip", "DJI Flip"], ["air-2", "DJI Air 2"], ["air-2s", "DJI Air 2S"], ["air-3", "DJI Air 3"],
        ["air-3s", "DJI Air 3S"], ["mavic-2-pro", "DJI Mavic 2 Pro"], ["mavic-2-zoom", "DJI Mavic 2 Zoom"],
        ["mavic-3", "DJI Mavic 3"], ["mavic-3-classic", "DJI Mavic 3 Classic"], ["mavic-3-pro", "DJI Mavic 3 Pro"],
        ["mavic-3-pro-cine", "DJI Mavic 3 Pro Cine"], ["mavic-4-pro", "DJI Mavic 4 Pro"], ["fpv", "DJI FPV"],
        ["avata", "DJI Avata"], ["avata-2", "DJI Avata 2"], ["mavic-3-enterprise", "DJI Mavic 3 Enterprise"],
        ["mavic-3-thermal", "DJI Mavic 3 Thermal"], ["mavic-3-multispectral", "DJI Mavic 3 Multispectral"],
        ["matrice-4e", "DJI Matrice 4E"], ["matrice-4t", "DJI Matrice 4T"], ["matrice-30", "DJI Matrice 30"],
        ["matrice-30t", "DJI Matrice 30T"], ["matrice-300-rtk", "DJI Matrice 300 RTK"], ["matrice-350-rtk", "DJI Matrice 350 RTK"],
        ["matrice-400", "DJI Matrice 400"], ["inspire-2", "DJI Inspire 2"], ["inspire-3", "DJI Inspire 3"]
      ],
      "Autel Robotics": [
        ["evo-nano", "Autel EVO Nano"], ["evo-nano-plus", "Autel EVO Nano+"], ["evo-lite", "Autel EVO Lite"],
        ["evo-lite-plus", "Autel EVO Lite+"], ["evo-ii", "Autel EVO II"], ["evo-ii-pro", "Autel EVO II Pro"],
        ["evo-ii-pro-v3", "Autel EVO II Pro V3"], ["evo-max-4t", "Autel EVO Max 4T"]
      ],
      "Parrot": [
        ["anafi", "Parrot Anafi"], ["anafi-extended", "Parrot Anafi Extended"], ["anafi-ai", "Parrot Anafi Ai"],
        ["anafi-usa", "Parrot Anafi USA"], ["bebop-2", "Parrot Bebop 2"], ["disco", "Parrot Disco"]
      ],
      "Skydio": [["skydio-2", "Skydio 2"], ["skydio-2-plus", "Skydio 2+"], ["skydio-x2", "Skydio X2"], ["skydio-x10", "Skydio X10"]],
      "Yuneec": [["mantis-q", "Yuneec Mantis Q"], ["typhoon-h", "Yuneec Typhoon H"], ["h520", "Yuneec H520"], ["h850", "Yuneec H850"], ["q500", "Yuneec Q500"], ["q500-4k", "Yuneec Q500 4K"]],
      "Hubsan": [["zino", "Hubsan Zino"], ["zino-2", "Hubsan Zino 2"], ["zino-pro", "Hubsan Zino Pro"], ["ace-pro", "Hubsan Ace Pro"], ["mini-se", "Hubsan Zino Mini SE"]],
      "FIMI": [["x8-se", "FIMI X8 SE"], ["x8-se-2020", "FIMI X8 SE 2020"], ["x8-mini", "FIMI X8 Mini"], ["x8-tele", "FIMI X8 Tele"], ["mini-3", "FIMI Mini 3"]],
      "Potensic": [["atom", "Potensic ATOM"], ["atom-se", "Potensic ATOM SE"], ["atom-2", "Potensic ATOM 2"], ["dreamer-pro", "Potensic Dreamer Pro"], ["d88", "Potensic D88"]],
      "Holy Stone": [["hs720", "Holy Stone HS720"], ["hs720e", "Holy Stone HS720E"], ["hs720g", "Holy Stone HS720G"], ["hs700e", "Holy Stone HS700E"], ["hs600", "Holy Stone HS600"]],
      "HoverAir": [["x1", "HoverAir X1"], ["x1-pro", "HoverAir X1 PRO"], ["x1-pro-max", "HoverAir X1 PRO Max"]],
      "PowerVision": [["poweregg-x", "PowerVision PowerEgg X"], ["powerray", "PowerVision PowerRay"]],
      "Walkera": [["voyager-5", "Walkera Voyager 5"], ["perro", "Walkera PERRO"], ["runner-250", "Walkera Runner 250"], ["vitus-320", "Walkera Vitus 320"]],
      "BetaFPV": [["cetust", "BetaFPV Cetus"], ["cetus-pro", "BetaFPV Cetus Pro"], ["cetus-x", "BetaFPV Cetus X"], ["pavo-20", "BetaFPV Pavo20"], ["pavo-30", "BetaFPV Pavo30"]]
    },
    "Action Camera": {
      "GoPro": [["hero13-black", "GoPro HERO13 Black"], ["hero12-black", "GoPro HERO12 Black"], ["hero11-black", "GoPro HERO11 Black"], ["hero10-black", "GoPro HERO10 Black"], ["hero9-black", "GoPro HERO9 Black"], ["hero8-black", "GoPro HERO8 Black"], ["hero7-black", "GoPro HERO7 Black"], ["max2", "GoPro MAX2"], ["max", "GoPro MAX"]],
      "DJI": [["osmo-action-6", "DJI Osmo Action 6"], ["osmo-action-5-pro", "DJI Osmo Action 5 Pro"], ["osmo-action-4", "DJI Osmo Action 4"], ["osmo-action-3", "DJI Osmo Action 3"], ["osmo-action-2", "DJI Action 2"], ["osmo-360", "DJI Osmo 360"], ["osmo-pocket-4", "DJI Osmo Pocket 4"], ["osmo-pocket-3", "DJI Osmo Pocket 3"]],
      "Insta360": [["x6", "Insta360 X6"], ["x5", "Insta360 X5"], ["x4", "Insta360 X4"], ["x3", "Insta360 X3"], ["x2", "Insta360 X2"], ["ace-pro-2", "Insta360 Ace Pro 2"], ["ace-pro", "Insta360 Ace Pro"], ["ace", "Insta360 Ace"], ["go-3s", "Insta360 GO 3S"], ["go-3", "Insta360 GO 3"], ["one-rs", "Insta360 ONE RS"], ["one-rs-1-inch-360", "Insta360 ONE RS 1-Inch 360"]],
      "AKASO": [["brave-8", "AKASO Brave 8"], ["brave-7-le", "AKASO Brave 7 LE"], ["brave-7", "AKASO Brave 7"], ["brave-6-plus", "AKASO Brave 6 Plus"], ["v50x", "AKASO V50X"], ["v50-pro", "AKASO V50 Pro"]],
      "SJCAM": [["sj20", "SJCAM SJ20"], ["sj10-pro", "SJCAM SJ10 Pro"], ["c300", "SJCAM C300"], ["c200", "SJCAM C200"], ["sj8-pro", "SJCAM SJ8 Pro"]],
      "WOLFANG": [["ga400", "WOLFANG GA400"], ["ga300", "WOLFANG GA300"], ["ga200", "WOLFANG GA200"]],
      "Garmin": [["virb-ultra-30", "Garmin VIRB Ultra 30"], ["virb-360", "Garmin VIRB 360"], ["virb-xe", "Garmin VIRB XE"]],
      "Sony": [["rx0-ii", "Sony RX0 II"], ["fdr-x3000", "Sony FDR-X3000"], ["fdr-x1000v", "Sony FDR-X1000V"]],
      "Drift": [["ghost-xl", "Drift Ghost XL"], ["ghost-4k", "Drift Ghost 4K"], ["ghost-x", "Drift Ghost X"]]
    },
    "Camera": {
      "Canon": [["eos-r1", "Canon EOS R1"], ["eos-r5-ii", "Canon EOS R5 Mark II"], ["eos-r6-iii", "Canon EOS R6 Mark III"], ["eos-r6-ii", "Canon EOS R6 Mark II"], ["eos-r8", "Canon EOS R8"], ["eos-r7", "Canon EOS R7"], ["eos-r10", "Canon EOS R10"], ["eos-r50", "Canon EOS R50"], ["eos-r50-v", "Canon EOS R50 V"], ["eos-r100", "Canon EOS R100"], ["eos-c50", "Canon EOS C50"], ["eos-c70", "Canon EOS C70"], ["powershot-v1", "Canon PowerShot V1"]],
      "Sony": [["a1-ii", "Sony Alpha 1 II"], ["a7-v", "Sony Alpha 7 V"], ["a7-iv", "Sony Alpha 7 IV"], ["a7s-iii", "Sony Alpha 7S III"], ["a7c-ii", "Sony Alpha 7C II"], ["a7cr", "Sony Alpha 7CR"], ["a6700", "Sony Alpha 6700"], ["fx3", "Sony FX3"], ["fx30", "Sony FX30"], ["zv-e1", "Sony ZV-E1"], ["zv-e10-ii", "Sony ZV-E10 II"], ["zv-1-ii", "Sony ZV-1 II"], ["rx100-vii", "Sony RX100 VII"]],
      "Nikon": [["z9", "Nikon Z9"], ["z8", "Nikon Z8"], ["z6-iii", "Nikon Z6 III"], ["z5-ii", "Nikon Z5 II"], ["zf", "Nikon Zf"], ["z50-ii", "Nikon Z50 II"], ["z30", "Nikon Z30"], ["d850", "Nikon D850"], ["d780", "Nikon D780"], ["coolpix-p1100", "Nikon COOLPIX P1100"]],
      "Fujifilm": [["x-h2s", "Fujifilm X-H2S"], ["x-h2", "Fujifilm X-H2"], ["x-t5", "Fujifilm X-T5"], ["x-t50", "Fujifilm X-T50"], ["x-t30-iii", "Fujifilm X-T30 III"], ["x-s20", "Fujifilm X-S20"], ["x-e5", "Fujifilm X-E5"], ["x-m5", "Fujifilm X-M5"], ["x100vi", "Fujifilm X100VI"], ["gfx100-ii", "Fujifilm GFX100 II"], ["gfx100s-ii", "Fujifilm GFX100S II"], ["gfx100rf", "Fujifilm GFX100RF"]],
      "Panasonic": [["s1r-ii", "Panasonic Lumix S1RII"], ["s1ii", "Panasonic Lumix S1II"], ["s5iix", "Panasonic Lumix S5IIX"], ["s5ii", "Panasonic Lumix S5II"], ["gh7", "Panasonic Lumix GH7"], ["gh6", "Panasonic Lumix GH6"], ["g9ii", "Panasonic Lumix G9II"], ["g100d", "Panasonic Lumix G100D"], ["fz1000-ii", "Panasonic Lumix FZ1000 II"]],
      "OM System": [["om-1-ii", "OM System OM-1 Mark II"], ["om-3", "OM System OM-3"], ["om-5", "OM System OM-5"], ["om-5-ii", "OM System OM-5 II"], ["tg-7", "OM System Tough TG-7"]],
      "Leica": [["q3", "Leica Q3"], ["q3-43", "Leica Q3 43"], ["sl3", "Leica SL3"], ["sl3-s", "Leica SL3-S"], ["m11", "Leica M11"], ["m11-monochrom", "Leica M11 Monochrom"], ["d-lux-8", "Leica D-Lux 8"]],
      "Blackmagic Design": [["pocket-cinema-6k-g2", "Blackmagic Pocket Cinema Camera 6K G2"], ["pocket-cinema-6k-pro", "Blackmagic Pocket Cinema Camera 6K Pro"], ["pocket-cinema-4k", "Blackmagic Pocket Cinema Camera 4K"], ["cinema-camera-6k", "Blackmagic Cinema Camera 6K"], ["pyxis-6k", "Blackmagic PYXIS 6K"], ["ursa-mini-pro-12k", "Blackmagic URSA Mini Pro 12K"]],
      "Hasselblad": [["x2d-100c", "Hasselblad X2D 100C"], ["907x-cfii-100c", "Hasselblad 907X & CFV 100C"], ["x1d-ii-50c", "Hasselblad X1D II 50C"], ["907x-50c", "Hasselblad 907X 50C"]],
      "Sigma": [["fp", "Sigma fp"], ["fp-l", "Sigma fp L"], ["bf", "Sigma BF"], ["sd-quattro", "Sigma sd Quattro"], ["sd-quattro-h", "Sigma sd Quattro H"]],
      "Ricoh": [["gr-iv", "Ricoh GR IV"], ["gr-iii", "Ricoh GR III"], ["gr-iiix", "Ricoh GR IIIx"], ["theta-z1", "Ricoh Theta Z1"], ["theta-x", "Ricoh Theta X"]],
      "Pentax": [["k-3-iii", "Pentax K-3 III"], ["k-1-ii", "Pentax K-1 II"], ["kf", "Pentax KF"], ["645z", "Pentax 645Z"]],
      "RED": [["v-raptor", "RED V-RAPTOR"], ["komodo-x", "RED KOMODO-X"], ["komodo", "RED KOMODO"], ["v-raptor-xl", "RED V-RAPTOR XL"]],
      "ARRI": [["alexa-35", "ARRI ALEXA 35"], ["alexa-35-live", "ARRI ALEXA 35 Live"], ["alexa-mini-lf", "ARRI ALEXA Mini LF"], ["alexa-lf", "ARRI ALEXA LF"]]
    },
    "Camera Lens": {
      "Canon": [["rf-24-70-2-8", "Canon RF 24-70mm F2.8 L IS USM"], ["rf-70-200-2-8", "Canon RF 70-200mm F2.8 L IS USM"], ["rf-100-500", "Canon RF 100-500mm F4.5-7.1 L IS USM"], ["rf-50-1-2", "Canon RF 50mm F1.2 L USM"], ["rf-15-35-2-8", "Canon RF 15-35mm F2.8 L IS USM"]],
      "Sony": [["fe-24-70-gm2", "Sony FE 24-70mm F2.8 GM II"], ["fe-70-200-gm2", "Sony FE 70-200mm F2.8 GM OSS II"], ["fe-200-600", "Sony FE 200-600mm F5.6-6.3 G OSS"], ["fe-35-1-4-gm", "Sony FE 35mm F1.4 GM"], ["fe-50-1-2-gm", "Sony FE 50mm F1.2 GM"]],
      "Nikon": [["z-24-70-2-8", "NIKKOR Z 24-70mm f/2.8 S"], ["z-70-200-2-8", "NIKKOR Z 70-200mm f/2.8 VR S"], ["z-100-400", "NIKKOR Z 100-400mm f/4.5-5.6 VR S"], ["z-180-600", "NIKKOR Z 180-600mm f/5.6-6.3 VR"], ["z-50-1-2", "NIKKOR Z 50mm f/1.2 S"]],
      "Fujifilm": [["xf-16-55-2-8-ii", "Fujifilm XF16-55mmF2.8 R LM WR II"], ["xf-50-140-2-8", "Fujifilm XF50-140mmF2.8 R LM OIS WR"], ["xf-150-600", "Fujifilm XF150-600mmF5.6-8 R LM OIS WR"], ["xf-33-1-4", "Fujifilm XF33mmF1.4 R LM WR"], ["xf-23-1-4", "Fujifilm XF23mmF1.4 R LM WR"]],
      "Sigma": [["24-70-dg-dn-ii", "Sigma 24-70mm F2.8 DG DN II Art"], ["70-200-dg-dn", "Sigma 70-200mm F2.8 DG DN OS Sports"], ["28-45-dg-dn", "Sigma 28-45mm F1.8 DG DN Art"], ["105-macro", "Sigma 105mm F2.8 DG DN Macro Art"]],
      "Tamron": [["28-75-g2", "Tamron 28-75mm F2.8 G2"], ["35-150", "Tamron 35-150mm F2-2.8"], ["70-180-g2", "Tamron 70-180mm F2.8 G2"], ["50-400", "Tamron 50-400mm F4.5-6.3 VC"], ["150-500", "Tamron 150-500mm F5-6.7 VC"]],
      "Samyang": [["35-1-4-ii", "Samyang AF 35mm F1.4 II"], ["85-1-4-ii", "Samyang AF 85mm F1.4 II"], ["24-70-2-8", "Samyang AF 24-70mm F2.8 FE"]]
    },
    "Accessory": {
      "DJI": [["rc-2", "DJI RC 2"], ["rc-n3", "DJI RC-N3"], ["rc-pro", "DJI RC Pro"], ["mic-2", "DJI Mic 2"], ["mic-mini", "DJI Mic Mini"], ["osmo-mobile-7p", "DJI Osmo Mobile 7P"], ["rs-4", "DJI RS 4"], ["rs-4-pro", "DJI RS 4 Pro"]],
      "GoPro": [["max-lens-mod-2", "GoPro MAX Lens Mod 2.0"], ["media-mod", "GoPro Media Mod"], ["volta", "GoPro Volta"], ["light-mod", "GoPro Light Mod"]],
      "Insta360": [["flow-pro", "Insta360 Flow Pro"], ["flow-2-pro", "Insta360 Flow 2 Pro"], ["x5-battery", "Insta360 X5 Battery"], ["x6-battery", "Insta360 X6 Battery"], ["gps-preview-remote", "Insta360 GPS Preview Remote"]],
      "Sony": [["gp-vpt2bt", "Sony GP-VPT2BT Grip"], ["xlr-h1", "Sony XLR-H1 Handle Unit"], ["ecm-m1", "Sony ECM-M1 Microphone"], ["uwp-d", "Sony UWP-D Wireless System"]],
      "Canon": [["speedlite-el5", "Canon Speedlite EL-5"], ["br-e1", "Canon BR-E1 Remote"], ["hg-100tbr", "Canon HG-100TBR Tripod Grip"]],
      "Nikon": [["sb-5000", "Nikon SB-5000 Speedlight"], ["wr-r11b", "Nikon WR-R11b Wireless Remote"], ["mc-n10", "Nikon MC-N10 Remote Grip"]],
      "Manfrotto": [["befree-advanced", "Manfrotto Befree Advanced"], ["055-xpro3", "Manfrotto 055 XPRO3"], ["504x-head", "Manfrotto 504X Head"]],
      "Rode": [["wireless-pro", "RØDE Wireless PRO"], ["wireless-go-ii", "RØDE Wireless GO II"], ["videomic-ntg", "RØDE VideoMic NTG"]],
      "Sennheiser": [["mke-400", "Sennheiser MKE 400"], ["profile-wireless", "Sennheiser Profile Wireless"]]
    }
  };

  function step(number) {
    return document.querySelector('#quote-form .wizard-step[data-step="' + number + '"]');
  }

  function allModels(category, manufacturer) {
    return (CATALOG[category] && CATALOG[category][manufacturer]) || [];
  }

  function selectedCategory() {
    return document.getElementById("gear-category")?.value || "Drone";
  }

  function selectedManufacturer() {
    return document.getElementById("gear-manufacturer")?.value || "";
  }

  function populateManufacturerSelect() {
    const select = document.getElementById("gear-manufacturer");
    if (!select) return;
    const category = selectedCategory();
    const names = Object.keys(CATALOG[category] || {});
    const previous = select.value;
    select.innerHTML = '<option value="">-- Select manufacturer --</option>';
    names.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    if (names.includes(previous)) select.value = previous;
  }

  function populateModelSelect() {
    const select = document.getElementById("dji-model");
    if (!select) return;
    const category = selectedCategory();
    const manufacturer = selectedManufacturer();
    const models = allModels(category, manufacturer);
    const previous = select.value;
    select.innerHTML = '<option value="">-- Select model --</option>';
    models.forEach(item => {
      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];
      select.appendChild(option);
    });
    if (models.some(item => item[0] === previous)) select.value = previous;
  }

  function setupCategoryAndManufacturer() {
    const s = step(1);
    if (!s || s.dataset.gearCatalogReady === "true") return;
    s.dataset.gearCatalogReady = "true";
    s.innerHTML = `
      <h3>Step 1: What are you selling?</h3>
      <p>Select the type of equipment you want to sell.</p>
      <label for="gear-category">Equipment type</label>
      <select id="gear-category">
        <option value="">-- Select equipment type --</option>
        ${Object.keys(CATALOG).map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
      <label for="gear-manufacturer">Manufacturer</label>
      <select id="gear-manufacturer" disabled>
        <option value="">-- Select manufacturer --</option>
      </select>
      <input type="radio" name="manufacturer" value="dji" checked hidden aria-hidden="true">
      <div class="navigation-buttons"><button type="button" class="btn btn-next">Next</button></div>`;
    const category = document.getElementById("gear-category");
    category.addEventListener("change", function () {
      const manufacturer = document.getElementById("gear-manufacturer");
      manufacturer.disabled = !this.value;
      populateManufacturerSelect();
      const model = document.getElementById("dji-model");
      if (model) model.innerHTML = '<option value="">-- Select model --</option>';
    });
    document.getElementById("gear-manufacturer").addEventListener("change", function () {
      populateModelSelect();
      const hiddenManufacturer = document.querySelector('input[name="manufacturer"][value="dji"]');
      if (hiddenManufacturer) hiddenManufacturer.checked = true;
    });
    category.value = "Drone";
    category.dispatchEvent(new Event("change"));
  }

  function setupModelStep() {
    const s = step(2);
    if (!s) return;
    const label = s.querySelector('label[for="dji-model"]');
    if (label) label.textContent = "Select your model";
    const select = document.getElementById("dji-model");
    if (select) {
      select.addEventListener("change", function () {
        populateModelSelect();
      });
    }
  }

  function setupNonDroneFields() {
    const category = selectedCategory();
    const isDrone = category === "Drone";
    const step5 = step(5);
    if (step5) {
      const heading = step5.querySelector("h3");
      if (heading) heading.textContent = isDrone ? "Step 5: Flight Time" : "Step 5: Usage Information";
      let usage = step5.querySelector("#gear-usage-info");
      if (!isDrone && !usage) {
        usage = document.createElement("div");
        usage.id = "gear-usage-info";
        usage.innerHTML = `<label for="gear-usage-count">Shutter count / usage count (if known)</label><input type="number" id="gear-usage-count" min="0" step="1" placeholder="Optional"><p>Leave blank if the equipment does not provide a usage count.</p>`;
        step5.insertBefore(usage, step5.querySelector(".navigation-buttons"));
      }
      if (usage) usage.hidden = isDrone;
      const hiddenRange = step5.querySelector('input[name="flightHoursRange"][value="0-5"]');
      if (hiddenRange && !isDrone) {
        hiddenRange.checked = true;
        hiddenRange.closest("label")?.setAttribute("hidden", "true");
      }
      const flightInput = document.getElementById("flight-hours");
      if (flightInput) flightInput.hidden = !isDrone;
    }

    const step7 = step(7);
    if (step7) {
      step7.hidden = !isDrone;
      if (!isDrone) {
        const yes = step7.querySelector('input[name="unbound"][value="yes"]');
        if (yes) yes.checked = true;
      }
    }
  }

  function expectedPackageBatteries() {
    const model = document.getElementById("dji-model")?.value || "";
    const pkg = document.getElementById("package-select")?.value || "";
    const known = {
      "mini-5-pro|fly-more-rc-2": 3, "mini-4-pro|fly-more-rc-2": 3, "mini-4-pro|fly-more-rc-n2": 3,
      "mini-3-pro|fly-more-rc-n1": 3, "mini-3-pro|fly-more-dji-rc": 3, "mini-3|fly-more-rc-n1": 3,
      "mini-2|fly-more": 3, "neo|drone-only": 1, "neo|fly-more": 3, "neo-2|standard": 1, "neo-2|fly-more": 3,
      "flip|standard-rc-n3": 1, "flip|fly-more-rc-n3": 3, "flip|fly-more-rc-2": 3,
      "air|drone-only": 1, "air|standard": 1, "air|fly-more": 3, "air-2|drone-only": 1, "air-2|fly-more": 3,
      "air-2s|drone-only": 1, "air-2s|fly-more": 3, "air-3|drone-only": 1, "air-3|fly-more": 3,
      "air-3s|drone-only": 1, "air-3s|fly-more": 3, "mavic-2-pro|drone-only": 1, "mavic-2-pro|standard": 1,
      "mavic-2-pro|fly-more": 3, "mavic-2-zoom|drone-only": 1, "mavic-2-zoom|fly-more": 3,
      "mavic-3|drone-only": 1, "mavic-3|fly-more": 3, "mavic-3-classic|drone-only": 1, "mavic-3-classic|fly-more": 3,
      "mavic-3-pro|drone-only": 1, "mavic-3-pro|fly-more": 3, "mavic-3-pro-cine|drone-only": 1,
      "mavic-3-pro-cine|premium-combo": 3, "mavic-4-pro|drone-only": 1, "mavic-4-pro|fly-more": 3,
      "fpv|drone-only": 1, "fpv|fly-smart": 1, "avata|drone-only": 1, "avata|fly-smart": 2,
      "avata|pro-view": 2, "avata|explorer": 2, "avata-2|drone-only": 1, "avata-2|fly-more": 3
    };
    return known[model + "|" + pkg] || 1;
  }

  function hideBatteryStep() {
    const s = step(6);
    if (!s) return;
    s.hidden = true;
    s.setAttribute("aria-hidden", "true");
    const container = s.querySelector("#batteries-container");
    if (container) {
      container.innerHTML = "";
      const count = expectedPackageBatteries();
      for (let i = 1; i <= count; i++) {
        const entry = document.createElement("div");
        entry.className = "battery-entry";
        entry.innerHTML = `<input type="text" class="battery-type" value="Package battery ${i}"><input type="number" class="battery-cycles" class="battery-cycles" value="0">`;
        container.appendChild(entry);
      }
    }
  }

  function packageItemsForCategory() {
    const category = selectedCategory();
    if (category === "Action Camera") return [
      ["camera", "Camera"], ["battery-1", "Battery"], ["charger", "Charger"], ["cables", "Cables"], ["case", "Protective case"], ["mounts", "Mounts / brackets"], ["accessories", "Standard accessories"]
    ];
    if (category === "Camera") return [
      ["camera", "Camera body"], ["battery-1", "Battery"], ["charger", "Charger"], ["cables", "Cables"], ["strap", "Strap"], ["case", "Body cap / case"], ["accessories", "Standard accessories"]
    ];
    if (category === "Camera Lens") return [["lens", "Lens"], ["caps", "Front / rear caps"], ["hood", "Lens hood"], ["case", "Case / pouch"], ["accessories", "Standard accessories"]];
    if (category === "Accessory") return [["item", "Main item"], ["charger", "Charger / power supply"], ["cables", "Cables"], ["case", "Case / packaging"], ["accessories", "Standard accessories"]];
    return [["drone", "Drone"], ["controller", "Controller"], ["battery-1", "Battery 1"], ["battery-2", "Battery 2"], ["battery-3", "Battery 3"], ["charging-hub", "Charging Hub"], ["bag", "Carry case / bag"], ["propellers", "Propellers / wings"], ["power-supply", "Power Supply"], ["cables", "Cables"]];
  }

  function populatePackageContents() {
    const container = document.getElementById("package-contents-list");
    if (!container) return;
    container.innerHTML = "";
    let items = packageItemsForCategory();
    if (selectedCategory() === "Drone") items = items.slice(0, expectedPackageBatteries() + 2).concat(items.slice(5));
    items.forEach(([id, name]) => {
      const row = document.createElement("div");
      row.className = "package-content-row";
      row.innerHTML = `<label for="contents-${id}">${name}</label><select id="contents-${id}" class="package-content-select" data-content-id="${id}"><option value="">-- Select status --</option><option value="present">Present</option><option value="missing">Missing</option></select>`;
      container.appendChild(row);
    });
  }

  function rebuildAdditionalItems() {
    const s = step(10);
    if (!s || s.dataset.gearAdditionalReady === "true") return;
    s.dataset.gearAdditionalReady = "true";
    s.innerHTML = `
      <h3>Step 10: Additional Items</h3>
      <p>Add anything you have that is <strong>in addition to the selected package</strong>. Do not enter items already included in the package.</p>
      <fieldset>
        <legend>Additional equipment</legend>
        <label>Additional batteries <select id="extra-battery-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
        <div id="extra-battery-cycles"></div>
        <label>Additional controllers <select id="extra-controller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
        <label>Additional hard cases <select id="extra-hardcase-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
        <label>Additional chargers <select id="extra-charger-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
        <label>Additional charging hubs <select id="extra-hub-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option></select></label>
        <label>Additional propellers / wings <select id="extra-propeller-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></label>
        <label>Other small accessories <select id="extra-small-count"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></label>
      </fieldset>
      <div class="navigation-buttons"><button type="button" class="btn btn-back">Back</button><button type="button" class="btn btn-next">Next</button></div>
      <div id="serial-fields-hidden" style="display:none"><input type="text" id="drone-serial-number"><input type="text" id="controller-serial-number"></div>`;
  }

  function extraData() {
    const n = id => Number(document.getElementById(id)?.value || 0);
    const extras = {
      batteries: n("extra-battery-count"), controllers: n("extra-controller-count"), hardCases: n("extra-hardcase-count"),
      chargers: n("extra-charger-count"), hubs: n("extra-hub-count"), propellers: n("extra-propeller-count"), small: n("extra-small-count")
    };
    extras.cycles = Array.from(document.querySelectorAll(".extra-battery-cycle")).map(i => Math.max(0, Number(i.value) || 0));
    return extras;
  }

  function updateExtraBatteryFields() {
    const select = document.getElementById("extra-battery-count");
    const box = document.getElementById("extra-battery-cycles");
    if (!select || !box) return;
    const count = Number(select.value) || 0;
    box.innerHTML = "";
    for (let i = 1; i <= count; i++) box.insertAdjacentHTML("beforeend", `<label>Additional battery ${i} cycle count <input type="number" class="extra-battery-cycle" min="0" step="1" value="0"></label>`);
  }

  function missingPackageBatteryCount() {
    return Array.from(document.querySelectorAll('.package-content-select[data-content-id^="battery-"]')).filter(s => s.value === "missing").length;
  }

  function cycleDeduction(extras) {
    return extras.cycles.reduce((sum, cycles) => cycles <= 50 ? sum : cycles <= 100 ? sum + 5 : cycles <= 200 ? sum + 15 : cycles <= 300 ? sum + 30 : sum + 50, 0);
  }

  function additionalValue(extras) {
    return extras.batteries * EXTRA_VALUES.battery + extras.controllers * EXTRA_VALUES.controller + extras.hardCases * EXTRA_VALUES.hardCase + extras.chargers * EXTRA_VALUES.charger + extras.hubs * EXTRA_VALUES.chargingHub + extras.propellers * EXTRA_VALUES.propellers + extras.small * EXTRA_VALUES.smallAccessory;
  }

  function adjustDjiResult() {
    if (selectedCategory() !== "Drone" || selectedManufacturer() !== "DJI") return;
    const resultStep = step(12);
    const priceEl = resultStep?.querySelector(".quote-price");
    if (!priceEl) return;
    const base = Number(priceEl.textContent.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(base)) return;
    const extras = extraData();
    const missingBatteryDeduction = missingPackageBatteryCount() * EXTRA_VALUES.battery;
    const cycle = cycleDeduction(extras);
    const add = additionalValue(extras);
    const adjusted = Math.max(0, base - missingBatteryDeduction - cycle + add);
    priceEl.textContent = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(adjusted);
    const line = Array.from(resultStep.querySelectorAll("p")).find(p => p.textContent.includes("Batteries:"));
    if (line) line.innerHTML = `<strong>Batteries:</strong> ${expectedPackageBatteries() + extras.batteries}`;
    let note = resultStep.querySelector(".gear-adjustment-note");
    if (!note) { note = document.createElement("p"); note.className = "gear-adjustment-note"; resultStep.querySelector(".quote-price-box")?.appendChild(note); }
    const changes = [];
    if (missingBatteryDeduction) changes.push(`${missingPackageBatteryCount()} missing package battery${missingPackageBatteryCount() === 1 ? "" : "ies"}: -£${missingBatteryDeduction}`);
    if (cycle) changes.push(`additional battery cycle adjustment: -£${cycle}`);
    if (add) changes.push(`additional equipment: +£${add}`);
    note.textContent = changes.length ? changes.join(" • ") : "No package-content or additional-item adjustment applied.";
    window.__gearCashOutAdjustedQuote = adjusted;
  }

  function persistAdjustedQuote() {
    const amount = window.__gearCashOutAdjustedQuote;
    if (!Number.isFinite(amount)) return;
    try {
      const raw = localStorage.getItem("wba_latest_quote");
      if (!raw) return;
      const saved = JSON.parse(raw);
      saved.quoteAmount = amount;
      saved.additionalAccessories = extraData();
      localStorage.setItem("wba_latest_quote", JSON.stringify(saved));
    } catch (e) { console.warn("Could not persist GearCashOut adjusted valuation.", e); }
  }

  function standardiseProgress() {
    const labels = document.querySelectorAll("#progress-indicator .progress-step");
    if (labels[0]) labels[0].textContent = "1. Equipment & Manufacturer";
    if (labels[1]) labels[1].textContent = "2. Model";
    if (labels[5]) { labels[5].textContent = "6. Package Batteries"; labels[5].hidden = true; }
    if (labels[8]) labels[8].textContent = "9. Package Contents";
    if (labels[9]) labels[9].textContent = "10. Additional Items";
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupCategoryAndManufacturer();
    setupModelStep();
    rebuildAdditionalItems();
    standardiseProgress();

    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    if (category) category.addEventListener("change", () => { populateManufacturerSelect(); setupNonDroneFields(); });
    if (manufacturer) manufacturer.addEventListener("change", () => { populateModelSelect(); setupNonDroneFields(); });

    document.addEventListener("change", function (event) {
      if (event.target.id === "extra-battery-count") updateExtraBatteryFields();
      if (event.target.id === "package-select") setTimeout(populatePackageContents, 20);
    });

    const form = document.getElementById("quote-form");
    if (!form) return;

    const observer = new MutationObserver(function () {
      const result = step(12);
      if (result && !result.hidden) setTimeout(adjustDjiResult, 30);
      const s9 = step(9);
      if (s9 && !s9.hidden) setTimeout(populatePackageContents, 10);
      const s6 = step(6);
      if (s6 && !s6.hidden) {
        hideBatteryStep();
        setTimeout(() => {
          const next = s6.querySelector(".btn-next");
          if (next) next.click();
        }, 20);
      }
    });
    observer.observe(form, { attributes: true, subtree: true, attributeFilter: ["hidden"] });

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;
      const s = button.closest(".wizard-step");
      if (!s) return;
      if (Number(s.dataset.step) === 9 && button.classList.contains("btn-next")) setTimeout(adjustDjiResult, 100);
      if (Number(s.dataset.step) === 10 && button.classList.contains("btn-next")) setTimeout(adjustDjiResult, 100);
      if (Number(s.dataset.step) === 13 && button.classList.contains("btn-next")) setTimeout(persistAdjustedQuote, 100);
    });

    setupNonDroneFields();
  });
})();