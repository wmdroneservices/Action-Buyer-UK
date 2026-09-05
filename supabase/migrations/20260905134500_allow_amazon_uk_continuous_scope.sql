-- Allow Amazon UK Only as a valid continuous-research source scope.
alter table public.quote_catalog_ai_continuous_control
  drop constraint if exists quote_catalog_ai_continuous_control_evidence_scope_check;

alter table public.quote_catalog_ai_continuous_control
  add constraint quote_catalog_ai_continuous_control_evidence_scope_check
  check (evidence_scope = any (array['all','new_uk','used_uk','overseas','amazon_uk']));