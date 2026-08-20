// Equipment configuration engine
// Combines catalogue, questions and rules into one configurable layer.

const EquipmentConfigEngine = {
  getConfiguration(category, condition) {
    return {
      category,
      condition,
      questions: this.getQuestions(category, condition),
      rules: this.getRules(category, condition)
    };
  },

  getQuestions(category, condition) {
    const base = {
      condition: true,
      model: true,
      photos: true
    };

    if (['drone', 'controller', 'camera'].includes(category)) {
      base.serialNumber = true;
    }

    if (category === 'drone' && condition !== 'new_sealed') {
      base.flightTime = true;
      base.batteryCycles = true;
      base.bindingStatus = true;
    }

    return base;
  },

  getRules(category, condition) {
    return {
      sealedBypass: condition === 'new_sealed',
      requiresManualVerification: ['drone', 'controller', 'camera'].includes(category)
    };
  }
};

window.EquipmentConfigEngine = EquipmentConfigEngine;
