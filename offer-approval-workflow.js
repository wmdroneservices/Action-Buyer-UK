// Offer Approval Workflow
// Keeps automatic suggestions separate from final customer offers.

const OFFER_STAGES = {
  SUGGESTED: 'suggested',
  REVIEW: 'manual_review',
  ADJUSTED: 'adjusted_by_staff',
  SENT: 'offer_sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  VERIFIED: 'verified_after_inspection',
  COMPLETED: 'completed'
};

function createOfferRecord(quoteId, suggestedAmount) {
  return {
    quoteId,
    suggestedAmount,
    finalAmount: null,
    status: OFFER_STAGES.REVIEW,
    requiresPhysicalVerification: true,
    history: [
      {
        action: 'suggestion_created',
        amount: suggestedAmount
      }
    ]
  };
}

function approveOffer(offer, finalAmount) {
  return {
    ...offer,
    finalAmount,
    status: OFFER_STAGES.SENT,
    history: [
      ...offer.history,
      {
        action: 'offer_sent',
        amount: finalAmount
      }
    ]
  };
}

module.exports = {
  OFFER_STAGES,
  createOfferRecord,
  approveOffer
};
