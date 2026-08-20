/*
 GearCashOut equipment rules actions.
 Applies rule decisions without replacing the quote wizard.
*/
(function () {
  "use strict";

  function setStepVisibility(step, visible) {
    const section = document.querySelector('.wizard-step[data-step="' + step + '"]');
    if (section) section.hidden = !visible;
  }

  function applyRuleActions(rule) {
    if (!rule) return;

    const skipUsage = rule.skip && rule.skip.includes("usage");
    const skipBattery = rule.skip && rule.skip.includes("battery");
    const skipBinding = rule.skip && rule.skip.includes("binding");

    if (skipUsage) setStepVisibility(5, false);
    if (skipBattery) setStepVisibility(6, false);
    if (skipBinding) setStepVisibility(7, false);
  }

  document.addEventListener("equipmentRulesUpdated", function (event) {
    applyRuleActions(event.detail.rule);
  });

  window.gearCashOutApplyRuleActions = applyRuleActions;
})();
