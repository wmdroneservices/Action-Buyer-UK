// Offer Calculation Layer
// Calculates suggested buying offers from valuation research.
// Final offers remain subject to manual verification and approval.

const OfferCalculationLayer = {
  calculateSuggestedOffer(item) {
    const research = item.valuationResearch || [];

    const prices = research
      .map(entry => Number(entry.marketPrice))
      .filter(price => !Number.isNaN(price) && price > 0);

    if (!prices.length) {
      return {
        suggestedOffer: null,
        status: 'requires_manual_research'
      };
    }

    const averageMarketValue = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Initial buying margin only. This is not a final offer.
    const suggestedOffer = Math.round(averageMarketValue * 0.75);

    return {
      averageMarketValue,
      suggestedOffer,
      status: 'pending_manual_verification'
    };
  }
};

export default OfferCalculationLayer;
