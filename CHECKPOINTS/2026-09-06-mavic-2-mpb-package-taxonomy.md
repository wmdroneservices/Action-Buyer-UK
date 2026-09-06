# 2026-09-06 — Mavic 2 MPB package taxonomy and evidence routing

## Trigger

Deep Source research and manual MPB checking showed that the existing catalogue was too coarse for the Mavic 2 family. The catalogue had generic Standard/Fly More identities while MPB exposes materially separate exact pages for controller bundles and filter accessories.

## Evidence checked

- DJI Mavic 2 Zoom with RC1 Controller — £284–£369, 3 live units.
- DJI Mavic 2 Zoom with Smart Controller — exact page exists, currently out of stock.
- DJI Mavic 2 Zoom ND Filter Kit — £16–£18, 5 live units.
- DJI Mavic 2 Pro — existing exact page/evidence retained.
- DJI Mavic 2 Pro with DJI Smart Controller — £359–£374, 2 live units.
- DJI Mavic 2 Pro Fly More Combo — existing exact evidence retained.
- DJI Mavic 2 Pro Fly More Combo with Smart Controller — £639, 1 live unit.
- DJI Mavic 2 Pro ND Filters Set — exact accessory identity retained separately.

## Catalogue changes

### DJI Mavic 2 Pro

- Standard Package
- Fly More Combo
- With DJI Smart Controller
- Fly More Combo with Smart Controller

### DJI Mavic 2 Zoom

- With RC1 Controller
- Fly More Combo
- With Smart Controller

### Separate accessories

- Mavic 2 Zoom ND Filter Kit
- Mavic 2 Pro ND Filters Set

## Evidence routing

- The Deep Source ND Filter Kit candidate was moved from the Mavic 2 Zoom aircraft to the new exact accessory product and applied.
- The exact RC1 Controller candidate was applied to the corrected RC1 package identity.
- A duplicate RC1 discovery was reconciled to the same live evidence row rather than creating a duplicate price.

## Front-end compatibility

Updated hard-coded legacy package/battery maps in:

- `quote-navigation-start-fix.js`
- `quote-package-flow-fix.js`
- `quote-final-flow-fix.js`
- `quote-battery-fix.js`

The database-driven wizard can therefore expose the newly added Mavic 2 package identities without treating Fly More + Smart Controller as a one-battery package.

## Rule going forward

Exact controller packages, Fly More bundles and standalone accessories must be represented and valued as distinct catalogue identities. Similar model text is not sufficient grounds to merge evidence.

## Follow-up

Run the Research PC worker on a controlled Mavic 2 package set and confirm that each exact MPB title routes to the matching catalogue identity.
