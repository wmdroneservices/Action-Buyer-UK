# Sony MPB five-product evidence audit

Date: 7 September 2026

## Scope

Audited all ten Pending Review candidates created by completed Deep Source run:

`7dc6d17f-d140-4ff4-9e3a-a658baf7d410`

Target products:

- Sony Remote Commander
- Sony BC-QZ1 Charger
- Sony Alpha 1 II
- Sony VG-C4EM Vertical Grip
- Sony Protective Camera Case

## Audit result

### Accepted and applied

**Sony VG-C4EM Vertical Grip**

- exact MPB UK model page;
- live UK inventory independently verified;
- 2 available units;
- both Excellent;
- £224;
- applied to the catalogue as reference-only used-market evidence;
- does not affect automatic pricing.

The original candidate incorrectly marked package and variant as mismatch because the catalogue package name was the generic taxonomy label `Accessory`. The active learning registry already contains the correct rule that Accessory is not a literal package token.

### Denied

Nine candidates were denied because they were one or more of:

- generic/ambiguous identity;
- duplicate alias of a stronger priced candidate;
- exact identity but no current live UK price evidence;
- out-of-stock without usable price;
- stale/non-canonical path that did not collect current inventory;
- generic product description with insufficient exact model identity.

## Rating

Gemma's investigation for this five-product run is rated **4/10 for final evidence quality**.

Positive:

- all five requested Sony targets stayed within the Sony × MPB research scope;
- no DJI rule contamination was observed;
- exact target identities were found for several products;
- one strong, usable live pricing result was produced.

Weaknesses:

- 9 of 10 preserved candidates were not usable final catalogue evidence;
- generic aliases were retained alongside stronger exact pages;
- most candidates had no live price despite inventory-readiness rules;
- the Alpha 1 II current canonical MPB path was not reached;
- generic Accessory taxonomy was still treated as a package mismatch despite an existing active learning rule.

## Follow-up

Do not alter manufacturer × URL isolation based on this audit. That repair worked.

The next diagnostic target is candidate scoring and canonical MPB page selection:

1. enforce existing taxonomy Accessory rule during scoring;
2. prefer current canonical exact MPB model pages;
3. do not preserve duplicate aliases when a stronger priced exact candidate exists;
4. final pricing evidence must contain current price/inventory or be explicitly classified as non-pricing discovery.
