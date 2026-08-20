// Drone Testing and Grading Layer
// Internal workflow for preparing purchased drones for resale.

const testingStatuses = [
  'Awaiting Test',
  'Testing In Progress',
  'Test Complete',
  'Ready For Grading'
];

const gradingCategories = {
  cosmetic: ['Excellent', 'Good', 'Fair', 'Poor'],
  operational: ['Passed', 'Requires Attention', 'Failed']
};

function createTestRecord(assetId) {
  return {
    assetId,
    status: 'Awaiting Test',
    cameraCheck: null,
    flightTest: null,
    batteryHealth: null,
    controllerTest: null,
    notes: []
  };
}

function updateTestResult(record, field, result) {
  record[field] = result;
  return record;
}

function createConditionReport(assetId, grading) {
  return {
    assetId,
    grading,
    completedAt: new Date().toISOString()
  };
}

module.exports = {
  testingStatuses,
  gradingCategories,
  createTestRecord,
  updateTestResult,
  createConditionReport
};
