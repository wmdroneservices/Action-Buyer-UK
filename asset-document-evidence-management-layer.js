/**
 * Action Buyer UK - Asset Document & Evidence Management Layer
 *
 * Keeps all supporting records linked to an individual drone asset.
 */

const DOCUMENT_TYPES = Object.freeze([
  'Purchase Record',
  'Serial Number Evidence',
  'Inspection Report',
  'Test Results',
  'Photographs',
  'Resale Documentation'
]);

function createAssetDocument({ assetId, type, reference, uploadedAt = new Date().toISOString(), uploadedBy = null }) {
  if (!assetId) throw new Error('assetId is required');
  if (!type) throw new Error('document type is required');

  return {
    assetId,
    type,
    reference,
    uploadedAt,
    uploadedBy
  };
}

function addAssetDocument(asset, document) {
  if (!asset) throw new Error('asset is required');

  return {
    ...asset,
    documents: [
      ...(asset.documents || []),
      document
    ]
  };
}

function getAssetDocuments(asset, type = null) {
  const documents = asset?.documents || [];

  if (!type) return documents;

  return documents.filter((document) => document.type === type);
}

function createEvidenceSummary(assets = []) {
  return assets.map((asset) => ({
    assetId: asset.assetId || asset.id || null,
    documentCount: (asset.documents || []).length,
    hasSerialEvidence: getAssetDocuments(asset, 'Serial Number Evidence').length > 0,
    hasInspectionReport: getAssetDocuments(asset, 'Inspection Report').length > 0,
    hasPhotos: getAssetDocuments(asset, 'Photographs').length > 0
  }));
}

module.exports = {
  DOCUMENT_TYPES,
  createAssetDocument,
  addAssetDocument,
  getAssetDocuments,
  createEvidenceSummary
};
