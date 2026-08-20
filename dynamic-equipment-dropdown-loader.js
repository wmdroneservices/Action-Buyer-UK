// Dynamic equipment dropdown loader
// Keeps equipment categories database/config driven.
// New equipment types can be added without changing quote flow logic.

const equipmentDropdownConfig = {
  categories: [
    'Drone',
    'Controller',
    'Charger',
    'Camera',
    'Drone Replacement Part',
    'Accessory'
  ]
};

function getEquipmentCategories() {
  return equipmentDropdownConfig.categories;
}

function addEquipmentCategory(category) {
  if (!equipmentDropdownConfig.categories.includes(category)) {
    equipmentDropdownConfig.categories.push(category);
  }
}

export { getEquipmentCategories, addEquipmentCategory };
