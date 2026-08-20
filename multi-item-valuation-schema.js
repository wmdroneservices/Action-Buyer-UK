/*
 GearCashOut multi item valuation schema foundation.
 Designed for one customer quote containing multiple items.
 Each item can receive its own offer decision while keeping one customer communication thread.
*/
(function () {
  "use strict";

  window.gearCashOutMultiItemSchema = {
    quote: {
      quoteId: null,
      customerId: null,
      status: "submitted",
      items: []
    },

    item: {
      itemId: null,
      equipmentType: null,
      manufacturer: null,
      model: null,
      condition: null,
      valuationStatus: "pending",
      staffOffer: null,
      customerDecision: null
    },

    decisions: [
      "pending",
      "offer-made",
      "accepted",
      "refused"
    ]
  };
})();
