# Checkpoint — Customer Return Accounting Closure

**Date:** 7 September 2026

## User decision

A post-sale buyer return must not be resolved immediately after physical receipt.

The workflow must retain enough operational and financial detail to feed a future accounts system.

## Implemented

### Return shipping

- Return label carrier
- Tracking number
- Label URL
- Return-label cost

### Mandatory closure assessment

Before a received return can become **Resolved**, staff must record:

- what happened / assessment;
- damage or condition found;
- returned-item disposition;
- customer resolution.

Supported returned-item dispositions:

- Returned to Stock / Resale
- Sent to Auction
- Broken Down for Spares
- Sent for Repair
- Second-hand Spares Sale
- Written Off / Recycled
- Other

### Customer financial resolution

Where applicable:

- full or partial refund;
- replacement item;
- refund and replacement;
- no customer payment;
- refund method;
- payment provider/processor such as Stripe;
- refund amount;
- refund transaction/reference;
- replacement asset/reference and notes.

## Backend

Table extended:

`sales_customer_returns`

New dedicated RPCs:

- `staff_record_sales_customer_return_label(...)`
- `staff_resolve_sales_customer_return(...)`

The legacy generic resolve action now rejects attempts to close an Item Received return without the detailed assessment and financial closure record.

## Asset handling

The return closure records what happened to the item but does not silently force the asset into a new resale status. The asset remains explicitly auditable; later inventory routing should be deliberate.

## Verification

Live Supabase schema was checked after deployment.

Verified:

- new accounting/closure columns exist;
- dedicated label-cost RPC exists;
- dedicated detailed-resolution RPC exists;
- legacy generic resolve path now refuses incomplete closure.

## Next browser test

Use the existing **Item Received** customer return and verify:

1. return assessment form appears;
2. all mandatory fields block incomplete closure;
3. refund validation works;
4. replacement reference/asset validation works;
5. resolved summary displays all retained information.
