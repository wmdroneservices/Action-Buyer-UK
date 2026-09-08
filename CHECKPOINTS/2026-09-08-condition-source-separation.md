# 2026-09-08 Condition Source Separation

## Decision

GearCashOut keeps two distinct condition concepts.

### Customer-declared condition

Customer condition and exception notes are valuation-stage historical information. They remain visible for staff reference only.

### Staff inspection condition

The staff inspection condition is the authoritative resale condition. The current physical-item field is:

- `inventory_assets.condition_grade`

Inspection/testing records remain supporting audit evidence.

## Sales rule

Only the staff inspection condition may be used for:

- Product Workbench sales condition;
- GearCashOut retail website listing data;
- `resale_listings.listing_data.condition`;
- marketplace/channel listing payloads.

Customer-declared condition must never be substituted as resale condition.

## Investigation result

Live Sent to Sales test records confirmed that some older test assets have no customer condition at all, while staff condition is held separately. Existing channel payload construction already uses `condition_grade`.

The sales handoff display was clarified so the authoritative staff field takes precedence over supporting inspection-row fallbacks.

## Regression guard

If staff condition is missing, show that it is not recorded. Do not silently fall back to customer valuation condition.
