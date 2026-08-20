// Equipment Rule Registry
// Connects equipment catalogue entries to their question requirements.

const equipmentRuleRegistry = {
  drone: {
    used: 'drone-used',
    sealed: 'drone-sealed'
  },
  controller: {
    used: 'controller-used',
    sealed: 'controller-sealed'
  },
  camera: {
    used: 'camera-used',
    sealed: 'camera-sealed'
  },
  charger: {
    used: 'charger-used',
    sealed: 'charger-sealed'
  },
  accessory: {
    used: 'accessory-used',
    sealed: 'accessory-sealed'
  },
  replacementPart: {
    used: 'part-used',
    sealed: 'part-sealed'
  }
};

function getEquipmentRuleKey(type, condition) {
  const category = equipmentRuleRegistry[type];
  if (!category) return null;

  return condition === 'new_sealed'
    ? category.sealed
    : category.used;
}

window.equipmentRuleRegistry = equipmentRuleRegistry;
window.getEquipmentRuleKey = getEquipmentRuleKey;
