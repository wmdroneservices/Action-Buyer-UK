// Equipment database schema foundation
// Designed for future Supabase tables and Google Sheets export.

const equipmentSchema = {
  equipment_types: {
    id: 'unique identifier',
    name: 'display name',
    category: 'equipment category',
    active: true
  },

  manufacturers: {
    id: 'unique identifier',
    name: 'manufacturer name',
    active: true
  },

  models: {
    id: 'unique identifier',
    manufacturer_id: 'linked manufacturer',
    model_name: 'model name',
    equipment_type_id: 'linked equipment type'
  },

  packages: {
    id: 'unique identifier',
    model_id: 'linked model',
    package_name: 'standard/combo/etc',
    included_batteries: 0,
    included_accessories: []
  },

  equipment_rules: {
    id: 'unique identifier',
    equipment_type_id: 'linked type',
    condition_rules: [],
    required_questions: [],
    sealed_rules: []
  }
};

module.exports = equipmentSchema;
