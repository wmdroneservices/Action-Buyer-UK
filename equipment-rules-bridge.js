/*
 GearCashOut equipment rules bridge.
 Connects the new rules foundation to the existing wizard without replacing the quote flow.
*/
(function () {
  "use strict";

  function getRules() {
    return window.gearCashOutEquipmentRules || null;
  }

  window.gearCashOutApplyEquipmentRules = function () {
    const rules = getRules();
    const category = document.getElementById("gear-category");
    const conditionInputs = document.querySelectorAll('input[name="condition"]');

    if (!rules || !category) return;

    const type = category.value;
    const condition = Array.from(conditionInputs).find(function (input) {
      return input.checked;
    });

    const selectedCondition = condition ? condition.value : "used";
    const equipment = rules.equipmentTypes[type];

    if (!equipment) return;

    const isNew = selectedCondition === "factory-sealed";
    const rule = isNew ? equipment.newSealed : equipment.used;

    window.currentEquipmentRule = rule || null;

    document.dispatchEvent(new CustomEvent("equipmentRulesUpdated", {
      detail: {
        type: type,
        condition: selectedCondition,
        rule: rule || null
      }
    }));
  };

  document.addEventListener("change", function (event) {
    if (event.target.id === "gear-category" || event.target.name === "condition") {
      window.gearCashOutApplyEquipmentRules();
    }
  });
})();
