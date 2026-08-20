/*
 GearCashOut equipment rules initialiser.
 Keeps the new rules system separate from the existing quote wizard.
*/
(function () {
  "use strict";

  window.gearCashOutEquipmentRulesReady = function () {
    return typeof window.gearCashOutApplyEquipmentRules === "function";
  };

  window.gearCashOutInitRules = function () {
    if (window.gearCashOutEquipmentRulesReady()) {
      window.gearCashOutApplyEquipmentRules();
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.gearCashOutInitRules();
  });
})();
