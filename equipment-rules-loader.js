/*
 GearCashOut equipment rules loader.
 Keeps rule startup separate from the existing quote wizard flow.
*/
(function () {
  "use strict";

  function initialiseEquipmentRules() {
    if (typeof window.gearCashOutApplyEquipmentRules === "function") {
      window.gearCashOutApplyEquipmentRules();
    }
  }

  document.addEventListener("DOMContentLoaded", initialiseEquipmentRules);
  document.addEventListener("equipmentRulesUpdated", function (event) {
    window.currentEquipmentRule = event.detail.rule || null;
  });
})();
