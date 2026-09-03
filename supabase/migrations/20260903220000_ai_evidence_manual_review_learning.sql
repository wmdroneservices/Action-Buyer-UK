-- GearCashOut AI evidence workflow: review first, editable candidates, persistent learning.
alter table public.quote_catalog_ai_candidates
  add column if not exists evidence_category text,
  add column if not exists market_region text,
  add column if not exists edited_title text,
  add column if not exists edited_price numeric,
  add column if not exists edited_condition text,
  add column if not exists edited_source_url text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists applied_evidence_id uuid;

create table if not exists public.quote_catalog_ai_learning (
  id uuid primary key default gen_random_uuid(),
  manufacturer text,
  product_type text,
  evidence_category text,
  learning_type text not null,
  learning_key text not null,
  learning_value jsonb not null default '{}'::jsonb,
  confidence numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learning_type, learning_key)
);

alter table public.quote_catalog_ai_learning enable row level security;

drop policy if exists quote_catalog_ai_learning_staff_select on public.quote_catalog_ai_learning;
create policy quote_catalog_ai_learning_staff_select on public.quote_catalog_ai_learning
for select to authenticated using (exists (select 1 from public.staff_users s where s.user_id=auth.uid()));

drop policy if exists quote_catalog_ai_learning_staff_write on public.quote_catalog_ai_learning;
create policy quote_catalog_ai_learning_staff_write on public.quote_catalog_ai_learning
for all to authenticated
using (exists (select 1 from public.staff_users s where s.user_id=auth.uid()))
with check (exists (select 1 from public.staff_users s where s.user_id=auth.uid()));

create or replace function public.apply_accepted_ai_candidate(p_candidate_id uuid)
returns uuid language plpgsql security invoker as $$
declare c public.quote_catalog_ai_candidates%rowtype; evidence_id uuid;
begin
 select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
 if not found then raise exception 'Candidate not found'; end if;
 if c.decision <> 'accepted' then raise exception 'Candidate must be accepted before applying'; end if;
 insert into public.quote_catalog_retailer_prices
 (catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes)
 values
 (c.catalog_product_id,coalesce(c.source_kind,'AI reviewed source'),coalesce(c.edited_condition,c.condition,'Unknown'),coalesce(c.edited_price,c.price),now(),coalesce(c.edited_source_url,c.source_url),concat('AI-reviewed evidence | ',coalesce(c.evidence_category,c.price_type,'Unclassified'),' | ',coalesce(c.edited_title,c.discovered_title,'')))
 on conflict do nothing returning id into evidence_id;
 update public.quote_catalog_ai_candidates set applied_at=now(),applied_evidence_id=evidence_id where id=p_candidate_id;
 return evidence_id;
end; $$;
grant execute on function public.apply_accepted_ai_candidate(uuid) to authenticated;