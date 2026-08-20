// Quote Rule Validation Runner
// Validates configuration output before connecting to live quote flow.

const quoteRuleValidationCases = [
  {
    name: "DJI Drone Used",
    expected: {
      flightTime: true,
      batteryCycles: true,
      bindingStatus: true,
      serialNumber: true,
      photos: true
    }
  },
  {
    name: "DJI Drone Factory Sealed",
    expected: {
      flightTime: false,
      batteryCycles: false,
      bindingStatus: false,
      serialNumber: "optional",
      photos: true
    }
  },
  {
    name: "Controller Only",
    expected: {
      flightTime: false,
      batteryCycles: false
    }
  },
  {
    name: "Charger Only",
    expected: {
      flightTime: false,
      batteryCycles: false
    }
  },
  {
    name: "Camera Replacement Part",
    expected: {
      flightTime: false,
      batteryCycles: false
    }
  }
];

function validateQuoteRules(result, expected) {
  return Object.keys(expected).every(key => {
    return result[key] === expected[key];
  });
}

window.quoteRuleValidation = {
  cases: quoteRuleValidationCases,
  validate: validateQuoteRules
};
