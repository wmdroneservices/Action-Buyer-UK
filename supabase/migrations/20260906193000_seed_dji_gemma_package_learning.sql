-- Seed durable Gemma learning from the DJI Deep Source audit.
-- These rules explain WHY the catalogue evidence was reassigned and are loaded
-- into the local Ollama prompt for future matching and review decisions.

insert into public.quote_catalog_ai_learning
(manufacturer,product_type,evidence_category,learning_type,learning_key,learning_value,confidence,active)
values
('DJI','Camera Drones','used_uk','package_identity_rule','dji|package|explicit_controller_beats_generic',
 jsonb_build_object(
  'instruction','When the source title or exact product page explicitly names a controller (for example RC-N1, RC-N2, RC-N3, RC1, RC 2, RC Pro or RC Pro Enterprise), treat that controller as package identity. Match/reassign only to the catalogue package with that exact controller. Do not collapse it into a generic Standard Package.',
  'why','DJI MPB audit repeatedly found exact controller identities that had previously been attached to the wrong generic or premium package.'
 ),0.99,true),
('DJI','Camera Drones','used_uk','package_identity_rule','dji|package|generic_source_not_specific_bundle',
 jsonb_build_object(
  'instruction','If the exact source identifies only the model and does not positively name Fly More, Cine, Creator, Plus, Smart Controller or another specific bundle/controller, do not infer a specific variant. Use the generic Standard Package only if that generic catalogue product exists; otherwise leave the candidate pending/uncertain.',
  'why','Generic MPB pages for Mavic 2 Pro, Mavic 3 Classic and Mavic 3 Pro must not contaminate specific premium bundle pricing.'
 ),0.99,true),
('DJI','Camera Drones','used_uk','package_identity_rule','dji|package|no_rc_means_drone_only',
 jsonb_build_object(
  'instruction','A source explicitly stating No RC or equivalent controller-free wording must route to Drone Only, not to a controller package.',
  'why','DJI Neo 2 MPB evidence explicitly identified No RC and was reassigned to Drone Only.'
 ),0.99,true),
('DJI','Camera Drones','all','package_identity_rule','dji|package|absence_is_not_positive_mismatch',
 jsonb_build_object(
  'instruction','Absence of a package label alone is not proof of mismatch. Mark mismatch only when the source positively identifies a conflicting package, controller or bundle. Otherwise use uncertain and preserve the exact evidence for review.',
  'why','Catalogue labels can be internal naming and may not appear verbatim on retailer pages.'
 ),0.98,true),
('DJI','Camera Drones','all','duplicate_check_rule','dji|duplicates|same_url_same_identity',
 jsonb_build_object(
  'instruction','Before creating a new product candidate, compare the exact manufacturer/model/package identity against the existing catalogue. Flag only high-confidence same-package matches as likely duplicates; same model with a different controller or bundle is not automatically a duplicate.',
  'why','The catalogue must distinguish DJI controller and bundle variants rather than collapsing every same-model result together.'
 ),0.98,true),
('DJI','Camera Drones','used_uk','source_rule','dji|mpb|exact_product_pages_only',
 jsonb_build_object(
  'instruction','For MPB UK, use only exact /en-uk/product/ pages as final pricing evidence. Search/category pages are discovery-only. Preserve one exact page as a reference range when it contains multiple live units.',
  'why','This prevents category/search prices or related products being treated as evidence for the target catalogue item.'
 ),0.99,true)
on conflict (learning_type,learning_key) do update
set manufacturer=excluded.manufacturer,
    product_type=excluded.product_type,
    evidence_category=excluded.evidence_category,
    learning_value=excluded.learning_value,
    confidence=greatest(public.quote_catalog_ai_learning.confidence,excluded.confidence),
    active=true,
    updated_at=now();
