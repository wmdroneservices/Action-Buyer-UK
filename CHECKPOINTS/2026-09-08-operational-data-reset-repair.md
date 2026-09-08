# Operational Data Reset Repair — 8 September 2026

## Why this was inspected

The sales workflow had accumulated contradictory test/operational records, and management decided to start the operational workflow afresh.

Before the destructive reset was used, the existing reset path was audited.

## First verified blocker

The live database contained:

- 1 `sales_fulfillments` record;
- 1 `sales_customer_returns` record.

Both had restrictive foreign-key relationships to `inventory_assets`.

The previous `reset_test_quote_data()` function attempted to delete inventory assets without first deleting these two blocker tables. A reset could therefore fail while leaving the system only partially cleared.

## Repair

The function now deletes, in dependency order:

1. `sales_customer_returns`;
2. `sales_fulfillments`;
3. `inventory_return_data`;
4. `customer_return_requests`;
5. `resale_transactions`;
6. `resale_listings`;
7. `inventory_assets` (with cascading dependent operational records);
8. shipment, email, sales, offer and valuation workflow records.

The existing function name was retained for compatibility with the front end.

## UI clarification

The management action is now labelled:

**CLEAR ALL OPERATIONAL DATA**

It clearly states that it removes workflow history while preserving:

- customer and staff accounts;
- catalogue/research/pricing data;
- outlets;
- system configuration.

## Important

The repair itself did **not** execute the destructive reset.

Management can now deliberately use the reset to start valuation, purchasing, inventory and sales operations afresh.

## Verification after use

Expected operational counts:

- valuations: 0
- quote items: 0
- sales: 0
- inventory assets: 0
- resale listings: 0
- resale transactions: 0
- sales fulfilments: 0
- sales customer returns: 0
- customer return requests: 0

Reference/system tables should remain intact.
