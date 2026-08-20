// Question Definition Model
// Central registry for equipment questions.
// New equipment types can select required questions without changing the wizard.

const questionDefinitions = {
  condition: {
    label: 'Condition',
    required: true
  },
  model: {
    label: 'Model',
    required: true
  },
  serialNumber: {
    label: 'Serial Number',
    required: false,
    highValueOnly: true
  },
  photos: {
    label: 'Photos',
    required: true
  },
  flightTime: {
    label: 'Flight Time',
    required: false,
    equipment: ['drone']
  },
  batteryCycles: {
    label: 'Battery Cycles',
    required: false,
    equipment: ['drone']
  },
  bindingStatus: {
    label: 'Binding Status',
    required: false,
    equipment: ['drone']
  }
};

if (typeof window !== 'undefined') {
  window.questionDefinitions = questionDefinitions;
}
