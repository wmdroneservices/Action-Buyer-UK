# Checkpoint — 2026-09-08 Receipt RPC UUID Aggregate Repair

## Fault

ITEM RECEIVED did not update either dashboard.

## Affected sale before repair

- `GCO-20260908220350-989e5a`
- `sales.status='shipping'`
- inbound shipment `status='in_transit'`
- no linked inventory asset

## Investigation

Checkpoint/history → receipt roadmap → current GitHub handler → live Supabase state → live RPC definition → transactional RPC test.

## First actual failure

`resolve_quote_item_catalog_product(...)` used `min(id)` on a UUID column, producing `function min(uuid) does not exist`. This rolled back the entire receipt transaction.

## Repair

- Added `supabase/migrations/20260908224500_fix_catalog_uuid_aggregate_receipt.sql`.
- Replaced `min(id)` with `(array_agg(id))[1]`.
- Preserved the exactly-one-match rule.

## Verification

Transactional dry run succeeded and reported one asset would be created. The affected live sale was then processed through the same authoritative RPC. Live verification confirmed:

- `sales.status='received'`
- inbound shipment `status='delivered'`
- linked inventory asset `status='Received'`

## Next browser verification

Refresh Purchasing and confirm receipt is complete / inspection is available. Refresh the customer account and confirm ITEM RECEIVED, then move into inspection and confirm UNDER INSPECTION.

Do not add another receipt click interceptor unless a new first failure is demonstrated.