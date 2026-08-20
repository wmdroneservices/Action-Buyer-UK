// Quote Rule Event Dispatcher
// Connects configuration decisions to the quote flow without replacing existing logic.

window.QuoteRuleDispatcher = {
  apply(configuration) {
    if (!configuration) return;

    const event = new CustomEvent('equipmentRulesUpdated', {
      detail: configuration
    });

    window.dispatchEvent(event);
  }
};

// Future use:
// QuoteRuleDispatcher.apply({ hide: ['battery', 'flightTime'] });
