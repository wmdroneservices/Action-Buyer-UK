// quote-battery-rule-adapter.js
// Battery handling rules for the new quote configuration system.
// Keeps package/battery logic separate from the existing wizard until tested.

const BatteryRuleAdapter = {
  apply(configuration) {
    if (!configuration) return { batteryStep: 'unchanged' };

    const result = {
      batteryStep: 'show',
      extraBatteryQuote: false,
      reason: ''
    };

    if (configuration.equipmentType !== 'drone') {
      result.batteryStep = 'hide';
      result.reason = 'Non-drone equipment does not require battery questions';
      return result;
    }

    if (configuration.condition === 'new-sealed') {
      result.batteryStep = 'hide';
      result.reason = 'Factory sealed items bypass battery history';
      return result;
    }

    if (configuration.packageType === 'standard') {
      result.extraBatteryQuote = true;
      result.reason = 'Standard package includes one battery; extras are quoted separately';
    }

    return result;
  }
};

if (typeof window !== 'undefined') {
  window.BatteryRuleAdapter = BatteryRuleAdapter;
}
