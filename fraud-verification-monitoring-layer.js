// Fraud Verification Monitoring Layer
// Provides risk checks for quote submissions, serial numbers and account activity.

const riskFlags = {
  DUPLICATE_SERIAL: 'duplicate_serial',
  DUPLICATE_ACCOUNT: 'duplicate_account',
  UNUSUAL_ACTIVITY: 'unusual_activity',
  MISSING_VERIFICATION: 'missing_verification'
};

function createRiskFlag(recordId, type, details) {
  return {
    recordId,
    type,
    details,
    status: 'open',
    createdAt: new Date().toISOString()
  };
}

function checkSerialNumber(serialNumbers) {
  const duplicates = serialNumbers.filter((item, index) => serialNumbers.indexOf(item) !== index);

  return duplicates.length > 0
    ? createRiskFlag('serial-check', riskFlags.DUPLICATE_SERIAL, duplicates)
    : null;
}

function checkQuoteActivity(activityCount) {
  if (activityCount > 10) {
    return createRiskFlag('activity-check', riskFlags.UNUSUAL_ACTIVITY, {
      submissions: activityCount
    });
  }

  return null;
}

function checkVerificationDocuments(requiredDocuments, uploadedDocuments) {
  const missing = requiredDocuments.filter(
    document => !uploadedDocuments.includes(document)
  );

  return missing.length > 0
    ? createRiskFlag('document-check', riskFlags.MISSING_VERIFICATION, missing)
    : null;
}

function resolveRiskFlag(flag) {
  return {
    ...flag,
    status: 'resolved',
    resolvedAt: new Date().toISOString()
  };
}

module.exports = {
  riskFlags,
  createRiskFlag,
  checkSerialNumber,
  checkQuoteActivity,
  checkVerificationDocuments,
  resolveRiskFlag
};
