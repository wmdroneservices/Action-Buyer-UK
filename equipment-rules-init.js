/*
 GearCashOut equipment rules initialiser.
 Keeps the new rules system separate from the existing quote wizard.
*/
(function () {
  "use strict";

  function loadScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  window.gearCashOutEquipmentRulesReady = function () {
    return typeof window.gearCashOutApplyEquipmentRules === "function";
  };

  window.gearCashOutInitRules = function () {
    loadScript("equipment-rules-actions.js");

    if (window.gearCashOutEquipmentRulesReady()) {
      window.gearCashOutApplyEquipmentRules();
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.gearCashOutInitRules();
  });
})();
