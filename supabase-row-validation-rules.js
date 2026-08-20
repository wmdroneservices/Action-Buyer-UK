// Supabase Row Validation Rules
// Prevents incomplete records entering the quote and offer system.

const validationRules = {
  quotes: {
    required: ["customer_id", "status"],
    allowedStatus: ["new", "review", "valuation", "offer_sent", "completed", "rejected"]
  },

  quote_items: {
    required: ["quote_id", "category", "condition"],
    sealedRulesApplied: true
  },

  valuations: {
    required: ["quote_item_id"],
    requiresResearchBeforeSuggestion: true
  },

  offers: {
    required: ["quote_item_id", "status"],
    allowedStatus: ["suggested", "manual_review", "sent", "accepted", "rejected", "verified", "completed"],
    finalPaymentRequiresVerification: true
  },

  audit_history: {
    required: ["record_type", "record_id", "action", "timestamp"]
  }
};

function validateRow(table, row) {
  const rules = validationRules[table];
  if (!rules) return { valid: false, error: "Unknown table" };

  const missing = rules.required.filter(field => !row[field]);

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  validationRules,
  validateRow
};
