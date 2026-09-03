-- Explicit evidence buckets used by GearCashOut pricing research:
-- 1 = New UK
-- 2 = Used UK
-- 3 = Overseas
-- Official product evidence remains separate and does not enter a price bucket.

alter table public.quote_catalog_ai_candidates
  add column if not exists evidence_bucket smallint;

update public.quote_catalog_ai_candidates
set evidence_bucket = case
  when evidence_category = 'new_uk' then 1
  when evidence_category = 'used_uk' then 2
  when evidence_category = 'overseas' then 3
  else null
end
where evidence_bucket is null;

alter table public.quote_catalog_ai_candidates
  drop constraint if exists quote_catalog_ai_candidates_evidence_bucket_chk;

alter table public.quote_catalog_ai_candidates
  add constraint quote_catalog_ai_candidates_evidence_bucket_chk
  check (evidence_bucket is null or evidence_bucket in (1,2,3));