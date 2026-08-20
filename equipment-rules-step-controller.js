/*
 GearCashOut equipment rules step controller.
 Restores hidden wizard steps when switching back to a condition that requires them.
*/
(function () {
  "use strict";

  function setStep(step, visible) {
    const section = document.querySelector('.wizard-step[data-step="' + step + '"]');
    if (section) section.hidden = !visible;
  }

  const stepMap = {
    usage: 5,
    battery: 6,
    binding: 7
  };

  document.addEventListener("equipmentRulesUpdated", function (event) {
    const rule = event.detail.rule;
    if (!rule) return;

    Object.keys(stepMap).forEach(function (key) {
      setStep(stepMap[key], !(rule.skip || []).includes(key));
    });
  });
})();
