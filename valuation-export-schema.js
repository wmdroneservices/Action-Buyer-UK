/*
 GearCashOut valuation export schema.
 Designed for future Google Sheets / CSV export.
 Keeps quote records flat and searchable.
*/
(function () {
  "use strict";

  window.gearCashOutExportSchema = [
    "quote_id",
    "customer_id",
    "item_number",
    "equipment_type",
    "manufacturer",
    "model",
    "package",
    "condition",
    "sealed_status",
    "serial_number",
    "photo_verified",
    "market_research_source",
    "market_value",
    "suggested_price",
    "staff_offer",
    "customer_decision",
    "final_outcome",
    "created_date"
  ];
})();
