/**
 * GearCashOut - Purchase → Inventory Boundary
 *
 * Contract for the database/RPC layer. The customer quote acceptance remains
 * the authoritative purchase event; this module prevents browser code from
 * treating an unaccepted quote as stock.
 */
const PURCHASE_ELIGIBLE_STATUSES = Object.freeze(['Quote Accepted']);

function assertPurchaseAccepted(quoteItem) {
  if (!quoteItem || !PURCHASE_ELIGIBLE_STATUSES.includes(quoteItem.status || quoteItem.item_status)) {
    throw new Error('Inventory cannot be created until the customer has accepted the quote.');
  }
  return true;
}

function buildInventorySeedFromAcceptedQuote(quoteItem, acceptedBy = null) {
  assertPurchaseAccepted(quoteItem);
  return {
    source_quote_item_id: quoteItem.id,
    manufacturer: quoteItem.manufacturer || null,
    model: quoteItem.model || quoteItem.item_name || null,
    serial_number: quoteItem.serial_number || null,
    purchase_price: Number(quoteItem.accepted_amount ?? quoteItem.offer_amount ?? 0),
    source: 'accepted_quote',
    accepted_by: acceptedBy,
    initial_status: 'Awaiting Receipt'
  };
}

function shouldReturnToCustomer(quoteItem) {
  const status = quoteItem?.status || quoteItem?.item_status;
  return ['Quote Declined', 'Return Required', 'Return Arranged', 'Returned to Customer'].includes(status);
}

if (typeof window !== 'undefined') window.PurchaseInventoryBoundary = {
  PURCHASE_ELIGIBLE_STATUSES,
  assertPurchaseAccepted,
  buildInventorySeedFromAcceptedQuote,
  shouldReturnToCustomer
};
if (typeof module !== 'undefined') module.exports = {
  PURCHASE_ELIGIBLE_STATUSES,
  assertPurchaseAccepted,
  buildInventorySeedFromAcceptedQuote,
  shouldReturnToCustomer
};
