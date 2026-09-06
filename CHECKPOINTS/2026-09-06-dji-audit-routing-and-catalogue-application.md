# Checkpoint — 6 September 2026 — DJI audit routing and catalogue application

## Reassignment failure repaired

The MOVE TO CORRECT PRODUCT workflow failed because reassign_ai_candidate(...) inserted into the reassignment audit table under invoker rights and RLS blocked the insert. The live RPC is now SECURITY DEFINER and retains its explicit staff authorization check. A matching migration has been added to the repository.

## UI repair

Wrong-target routing panels are now collapsed by default. Large audits therefore show compact routing rows instead of pages of expanded controls.

## DJI catalogue work completed

Clear MPB identities were normalised, accepted and applied. Deterministic routing included:

- Mini 2 standard RC-N1;
- Mini 4K RC-N1;
- Mavic Air standard controller;
- Flip RC-N3;
- Mini 4 Pro Fly More RC 2;
- Mavic 4 Pro Fly More RC 2 and 512GB Creator Combo RC Pro 2;
- Mavic 2 Zoom RC1;
- Mavic 2 Pro generic → Standard Package;
- Mavic 3 Enterprise RC Pro Enterprise;
- Mavic 3 Classic generic → Standard Package;
- Mavic 3 Pro generic → Standard Package;
- Neo 2 No RC → Drone Only;
- Osmo 360 generic → Standard Combo;
- exact accessory/battery/standard-item evidence where the catalogue identity already matched.

Generic source pages were deliberately not forced onto unsupported specific controller or bundle variants.

## Current audit state

The DJI MPB run itself completed as completed_with_errors after checking 197 products and producing 69 candidates, with 33 recorded errors. The worker match-status repository repair remains version 1.5.4; Research PC deployment/controlled verification is still a separate outstanding step.
