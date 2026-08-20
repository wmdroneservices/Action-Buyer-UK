// Quote Configuration Connector
// Connects the configuration engine to the quote workflow.
// Keeps customer-facing wizard logic separate from equipment rules.

const quoteConfigurationConnector = {
  applyEquipmentConfiguration(equipmentType, condition) {
    if (!window.equipmentConfigEngine) {
      return null;
    }

    return window.equipmentConfigEngine.getConfiguration({
      equipmentType,
      condition
    });
  }
};

window.quoteConfigurationConnector = quoteConfigurationConnector;
