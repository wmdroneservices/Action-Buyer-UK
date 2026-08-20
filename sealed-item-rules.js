// Sealed item rules
// Defines which verification steps can be skipped for factory sealed products.

const sealedItemRules = {
  drone: {
    bypass: [
      'flight_time',
      'battery_cycles',
      'usage_history',
      'binding_check'
    ],
    required: [
      'photos',
      'serial_number_if_available'
    ]
  },
  controller: {
    bypass: [
      'flight_time',
      'battery_cycles'
    ],
    required: [
      'photos',
      'serial_number_if_available'
    ]
  },
  camera: {
    bypass: [
      'usage_hours'
    ],
    required: [
      'photos',
      'serial_number_if_available'
    ]
  },
  charger: {
    bypass: [
      'flight_time',
      'battery_cycles',
      'serial_number'
    ],
    required: [
      'photos'
    ]
  },
  accessory: {
    bypass: [
      'flight_time',
      'battery_cycles',
      'serial_number'
    ],
    required: [
      'photos'
    ]
  }
};

window.sealedItemRules = sealedItemRules;
