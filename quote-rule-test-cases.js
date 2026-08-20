// Quote rule test cases
// Used to verify the dynamic equipment rules before connecting to production flow.

const quoteRuleTestCases = [
  {
    name: 'DJI drone used',
    category: 'drone',
    condition: 'used',
    expected: {
      flightTime: true,
      batteryCycles: true,
      bindingStatus: true,
      serialNumber: true,
      photos: true
    }
  },
  {
    name: 'DJI drone factory sealed',
    category: 'drone',
    condition: 'new_sealed',
    expected: {
      flightTime: false,
      batteryCycles: false,
      bindingStatus: false,
      serialNumber: 'optional_high_value',
      photos: true
    }
  },
  {
    name: 'Controller only',
    category: 'controller',
    condition: 'used',
    expected: {
      flightTime: false,
      batteryCycles: false,
      serialNumber: true,
      photos: true
    }
  },
  {
    name: 'Charger only',
    category: 'charger',
    condition: 'used',
    expected: {
      flightTime: false,
      batteryCycles: false,
      photos: true
    }
  },
  {
    name: 'Camera replacement part',
    category: 'camera',
    condition: 'used',
    expected: {
      flightTime: false,
      batteryCycles: false,
      photos: true
    }
  }
];

if (typeof window !== 'undefined') {
  window.quoteRuleTestCases = quoteRuleTestCases;
}
