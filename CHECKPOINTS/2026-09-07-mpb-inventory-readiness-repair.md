# GearCashOut Checkpoint — MPB exact-page inventory readiness repair

Date: 7 September 2026
Release: 1.5.13

## Trigger

After the 1.5.12 manufacturer × URL isolation repair was deployed, a controlled Sony × MPB Deep Source run completed successfully and created two new Pending Review candidates.

This confirmed that the earlier DJI/Sony cross-rule problem was no longer the first failure.

## Authoritative live result

Run: d197d457-dad0-4b5d-a4af-99f8aa539f6b

- status: completed
- products targeted: 1
- products checked: 1
- candidates found: 2
- errors: 0

The two new candidates were for Sony Alpha 1 II exact MPB URLs, but both had null price/range values and were preserved through the manual fallback.

## First remaining failure

The exact MPB page was discovered and accepted, but live inventory was not present in the browser HTML at the point the worker captured it.

The browser fallback used:

DOM loaded
→ fixed 2.5 second sleep
→ page.content()

MPB loads SKU inventory client-side, so the fixed delay could capture the product title before SKU/price rows appeared.

The existing unit extractor was also tightly coupled to one exact rendered text sequence.

## Repair

Worker 1.5.13:

1. Adds an exact-page-only inventory readiness wait for real MPB SKU text, bounded to 15 seconds.
2. Leaves discovery pages fast; they do not wait for inventory.
3. Keeps out-of-stock exact pages valid when no SKU appears.
4. Retains the strict known-layout MPB parser.
5. Adds bounded per-SKU fallback parsing so price, condition, shutter/charge count and included contents can be extracted when harmless layout ordering changes.

## Isolation invariant retained

This repair is source-rendering logic, not manufacturer-specific matching.

- DJI MPB behaviour must remain valid.
- Sony MPB behaviour must remain valid.
- Future manufacturers use the same source-level readiness and extraction contract.
- No manufacturer learns another manufacturer's URL suffix as a requirement.

## Deployment required

Update the complete local Research PC set:

1. package.json
2. supervisor.mjs
3. agent.mjs

Then run:

- node --check agent.mjs
- node --check supervisor.mjs
- npm install
- npm start

Verify heartbeat version 1.5.13-supervisor.

## Controlled regression

Run one Sony × MPB product first and confirm:

- exact MPB page discovered;
- browser fallback waits for SKU inventory where required;
- candidate has reference_price_min and reference_price_max;
- observed_units_count is populated;
- observed_conditions are populated;
- Body Only/package identity is supported by unit contents;
- no unrelated manufacturer URLs are crawled.

Then run one DJI × MPB product and confirm the same extraction change has not broken DJI.
