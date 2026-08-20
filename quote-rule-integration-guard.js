// quote-rule-integration-guard.js
// Safety layer before live quote wizard rule changes are applied.

(function () {
  window.QuoteRuleIntegrationGuard = {
    canApplyRules(validationResult) {
      return Boolean(validationResult && validationResult.valid);
    },

    applyIfValid(validationResult, applyFunction) {
      if (!this.canApplyRules(validationResult)) {
        console.warn('Quote rules blocked: validation failed');
        return false;
      }

      if (typeof applyFunction === 'function') {
        applyFunction();
      }

      return true;
    }
  };
})();
