-- Package equivalence and retailer-aware alias learning for Gemma.
-- Added after the DJI Deep Source audit to let the AI recognise different
-- retailer descriptions of the same canonical catalogue package without
-- collapsing genuinely different controller/bundle variants.

delete from public.quote_catalog_ai_learning
where learning_key in (
  'package_equivalence|canonical_identity',
  'package_equivalence|source_aware_aliases',
  'package_equivalence|retailer_specific_patterns',
  'package_equivalence|confidence_lifecycle',
  'package_equivalence|conflict_prevents_equivalence',
  'package_equivalence|promotion_requires_evidence'
);

insert into public.quote_catalog_ai_learning
(manufacturer,product_type,evidence_category,learning_type,learning_key,learning_value,confidence,active)
values
(null,null,'all','package_equivalence_rule','package_equivalence|canonical_identity',
'{"instruction":"Treat the GearCashOut catalogue product as the canonical identity. Compare retailer wording by underlying identity components rather than exact title text: manufacturer, model, controller, bundle/package, included accessories and variant. Different wording can map to one canonical package only when the underlying identity is supported by evidence.","why":"Retailers and marketplaces often rename or abbreviate the same package differently. Exact string matching is too weak, but loose semantic matching can create false package matches.","canonical_components":["manufacturer","model","controller","bundle/package","included accessories","variant"]}'::jsonb,0.99,true),

(null,null,'all','package_equivalence_rule','package_equivalence|source_aware_aliases',
'{"instruction":"Store and use alternative package descriptions as aliases tied to the canonical catalogue product, but keep the source/retailer that produced each alias. A confirmed alias from one retailer is evidence for that retailer first; it may become a broader alias only after independent confirmation.","why":"The same words can mean different things at different retailers, while one retailer may consistently use a non-standard phrase for a known package.","required_fields":["raw source wording","canonical product identity","source/retailer","supporting exact URLs or examples","confidence","confirmation status","reason"]}'::jsonb,0.99,true),

(null,null,'all','package_equivalence_rule','package_equivalence|retailer_specific_patterns',
'{"instruction":"Learn retailer-specific naming patterns separately from global package aliases. When a retailer repeatedly uses a phrase for the same canonical controller or bundle, record that mapping with the retailer/domain and evidence count. Do not automatically transfer a retailer-specific interpretation to another retailer without supporting evidence.","why":"Package terminology varies by retailer and marketplace, so source-aware learning is safer than one global synonym list."}'::jsonb,0.99,true),

(null,null,'all','package_equivalence_rule','package_equivalence|confidence_lifecycle',
'{"instruction":"Use three states for package equivalence: confirmed, probable and ambiguous. Confirmed mappings may be used confidently; probable mappings should be suggested or flagged for review; ambiguous mappings must not be auto-applied. Increase confidence through repeated independent exact evidence and human-confirmed corrections.","why":"This lets the memory grow from evidence without turning early guesses into permanent catalogue facts.","states":{"confirmed":"Repeated or independently supported, with no identity conflict.","probable":"Strong wording/identity evidence but insufficient confirmation.","ambiguous":"Missing or conflicting controller/package/accessory evidence."}}'::jsonb,0.99,true),

(null,null,'all','package_equivalence_rule','package_equivalence|conflict_prevents_equivalence',
'{"instruction":"Different wording does not make products equivalent when positive identity conflicts exist. A conflicting controller, explicit No RC, Fly More/Cine/Creator/Plus distinction, battery count, included screen controller or other package-defining accessory prevents automatic equivalence until evidence proves the catalogue distinction is wrong.","why":"The system must recognise aliases without collapsing genuinely different packages into one model."}'::jsonb,0.99,true),

(null,null,'all','package_equivalence_rule','package_equivalence|promotion_requires_evidence',
'{"instruction":"Do not invent aliases. A new description can be stored as a candidate alias, but promote it to confirmed learning only after repeated exact evidence, independent source confirmation, or explicit human confirmation. Preserve why the match was made so future Gemma runs can explain and audit the decision.","why":"Gemma memory should be cumulative and evidence-based, not a collection of unverified wording guesses.","promotion_paths":["repeated exact evidence","independent source confirmation","explicit human confirmation"]}'::jsonb,0.99,true);
