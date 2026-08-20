// Supabase service layer foundation
// Handles database operations between quote system and Supabase.

const supabaseService = {
  createQuote(payload) {
    return {
      table: 'quotes',
      action: 'insert',
      payload
    };
  },

  createQuoteItem(payload) {
    return {
      table: 'quote_items',
      action: 'insert',
      payload
    };
  },

  saveValuation(payload) {
    return {
      table: 'valuations',
      action: 'insert',
      payload
    };
  },

  createOffer(payload) {
    return {
      table: 'offers',
      action: 'insert',
      payload
    };
  },

  exportQuoteData(payload) {
    return {
      format: 'google-sheets-ready',
      payload
    };
  }
};

export default supabaseService;
