-- Allow Amazon UK Only to be recorded on continuous research runs.
alter table public.quote_catalog_ai_research_runs
  drop constraint if exists quote_catalog_ai_research_runs_evidence_scope_check;

alter table public.quote_catalog_ai_research_runs
  add constraint quote_catalog_ai_research_runs_evidence_scope_check
  check (evidence_scope = any (array['all','new_uk','used_uk','overseas','amazon_uk']));