// Physical Inspection Checklist Module
// Creates final verification checks before purchase completion

const inspectionChecklist = {
  droneBody: {
    required: true,
    checks: [
      'Frame condition',
      'Arms and propellers checked',
      'Signs of impact or repair'
    ]
  },
  cameraGimbal: {
    required: true,
    checks: [
      'Camera condition',
      'Gimbal movement',
      'Lens condition'
    ]
  },
  batteries: {
    required: true,
    checks: [
      'Battery count confirmed',
      'Cycle count verified where applicable',
      'Charging test completed'
    ]
  },
  controller: {
    required: false,
    checks: [
      'Controller included',
      'Screen/buttons tested',
      'Connection verified'
    ]
  },
  accessories: {
    required: false,
    checks: [
      'Included accessories checked',
      'Missing items recorded'
    ]
  },
  verification: {
    required: true,
    checks: [
      'Serial number confirmed',
      'Photos matched to submitted item',
      'Final approval recorded'
    ]
  }
};

function createInspectionRecord(itemId) {
  return {
    itemId,
    checklist: inspectionChecklist,
    status: 'pending_inspection',
    completedChecks: [],
    finalApproval: false
  };
}

module.exports = {
  inspectionChecklist,
  createInspectionRecord
};
