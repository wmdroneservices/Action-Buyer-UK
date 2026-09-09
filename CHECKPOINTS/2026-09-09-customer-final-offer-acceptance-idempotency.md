# Customer Final Offer Acceptance Popup — 9 September 2026

## Symptom

Customer clicked **ACCEPT FINAL OFFER** and received:

> Offer is not available for acceptance

## Investigation

Checked:

1. current project checkpoint/history;
2. Inventory Repair and Sales Workflow Diagnostic Roadmap;
3. current customer account code;
4. live quote offer/item/sale state;
5. live `public.accept_quote_offer` function definition;
6. Supabase migration history;
7. intended GitHub migration.

## First actual cause

The customer's final offer had already been accepted:

- offer status: `accepted`;
- quote item status: `accepted`;
- linked purchase had subsequently completed and been paid.

The customer-facing popup occurred because the production `accept_quote_offer` function was still non-idempotent and rejected a repeat request.

GitHub already contained the intended idempotency migration:

`supabase/migrations/20260828181000_make_customer_offer_acceptance_idempotent.sql`

However, Supabase migration history proved that this migration had not been applied to production.

## Repair

Applied the idempotent version of `public.accept_quote_offer` to production as:

`20260909175758_make_customer_offer_acceptance_idempotent_20260909`

Repeated acceptance of the same customer-owned offer now returns:

`already_accepted: true`

instead of displaying the false failure popup.

## Preserved protections

- ownership checks remain;
- genuinely unavailable offers still fail;
- unpublished offers cannot be accepted;
- no customer can accept another customer's offer.

## Verification

- Live function definition now contains the `already_accepted` return path.
- Supabase migration history records the production repair.
- The affected offer remains correctly accepted.
- No sale, payment or inventory records were modified by this repair.

## Documentation updated

- System Handbook
- AI Operating Manual
- Inventory Repair and Sales Workflow Diagnostic Roadmap
