// Quote Rule Step Adapter
// Maps configuration engine decisions to quote wizard step visibility.

(function () {
  const stepMap = {
    flightTime: '[data-step="5"]',
    batteries: '[data-step="6"]',
    binding: '[data-step="7"]',
    serial: '[data-step="10"]',
    photos: '[data-step="11"]'
  };

  function setStepVisible(key, visible) {
    const selector = stepMap[key];
    if (!selector) return;

    const element = document.querySelector(selector);
    if (!element) return;

    element.hidden = !visible;
  }

  function applyQuoteRules(config) {
    if (!config) return;

    Object.keys(stepMap).forEach((key) => {
      if (typeof config[key] === 'boolean') {
        setStepVisible(key, config[key]);
      }
    });
  }

  window.addEventListener('equipmentConfigurationUpdated', (event) => {
    applyQuoteRules(event.detail);
  });

  window.quoteRuleStepAdapter = {
    apply: applyQuoteRules
  };
})();
