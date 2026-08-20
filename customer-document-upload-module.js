// Customer Document Upload Module
// Handles document requirements for quote verification.

const documentTypes = {
  dronePhotos: {
    required: true,
    description: 'Photos of the drone and condition'
  },
  serialNumberImage: {
    required: true,
    description: 'Image showing serial number where available'
  },
  ownershipEvidence: {
    required: false,
    description: 'Proof of ownership or purchase information'
  },
  accessoryPhotos: {
    required: false,
    description: 'Photos of included accessories'
  },
  inspectionPhotos: {
    required: false,
    description: 'Photos captured during inspection'
  }
};

function createUploadRecord(quoteId, type, file) {
  return {
    quoteId,
    type,
    filename: file.filename,
    status: 'uploaded',
    uploadedAt: new Date().toISOString()
  };
}

function validateRequiredDocuments(uploadedDocuments) {
  return Object.keys(documentTypes)
    .filter(type => documentTypes[type].required)
    .every(type => uploadedDocuments.some(doc => doc.type === type));
}

module.exports = {
  documentTypes,
  createUploadRecord,
  validateRequiredDocuments
};
