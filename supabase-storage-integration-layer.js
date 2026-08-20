// Supabase Storage Integration Layer
// Handles document storage links for customer quotes.

const storageConfig = {
  bucket: 'quote-documents',
  folders: {
    photos: 'photos',
    ownership: 'ownership',
    inspections: 'inspections'
  }
};

function createStorageRecord({ quoteId, documentType, filePath }) {
  return {
    quoteId,
    documentType,
    filePath,
    bucket: storageConfig.bucket,
    status: 'uploaded',
    createdAt: new Date().toISOString()
  };
}

function validateStorageAccess(document) {
  return Boolean(document.quoteId && document.filePath);
}

function linkDocumentToQuote(document) {
  return {
    ...document,
    linked: true
  };
}

export {
  storageConfig,
  createStorageRecord,
  validateStorageAccess,
  linkDocumentToQuote
};
