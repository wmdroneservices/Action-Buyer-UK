/*
 GearCashOut database quote structure foundation.
 Designed for future Supabase tables and Google Sheets export.
*/
(function () {
  "use strict";

  window.gearCashOutDatabaseStructure = {
    tables: {
      quotes: {
        id: "uuid",
        customer_id: "uuid",
        status: "pending|offered|completed|archived"
      },
      quote_items: {
        id: "uuid",
        quote_id: "uuid",
        item_number: "integer",
        equipment_type: "text",
        model: "text",
        valuation_status: "pending|offered|accepted|refused"
      },
      offers: {
        id: "uuid",
        quote_item_id: "uuid",
        offer_amount: "decimal",
        customer_response: "accepted|refused|pending"
      },
      customers: {
        id: "uuid",
        address: "text",
        history: "linked records"
      }
    }
  };
})();
