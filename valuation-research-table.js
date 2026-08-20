// Valuation Research Table
// Stores multiple market comparisons for each item.

const valuationResearchTable = {
  table: "valuation_research",
  fields: {
    id: "unique identifier",
    quoteItemId: "linked quote item",
    source: "CEX, eBay, Amazon, competitor, previous sale",
    sourceUrl: "reference link",
    dateChecked: "research date",
    itemCondition: "condition used for comparison",
    comparisonPrice: "observed market price",
    notes: "manual valuation notes",
    reliability: "source confidence rating",
    addedBy: "staff member",
    createdAt: "timestamp"
  },
  supportedSources: [
    "CEX",
    "eBay",
    "Amazon",
    "Competitor Buyer",
    "Previous Action Buyer Sale"
  ]
};

export default valuationResearchTable;
