-- Preserve valid mismatched AI evidence and route it instead of discarding it.
alter table public.quote_catalog_ai_candidates
  add column if not exists original_catalog_product_id uuid references public.quote_catalog_products(id),
  add column if not exists reassigned_at timestamptz,
  add column if not exists reassigned_by uuid references auth.users(id),
  add column if not exists reassignment_reason text;

create table if not exists public.quote_catalog_ai_candidate_reassignments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.quote_catalog_ai_candidates(id) on delete cascade,
  from_catalog_product_id uuid not null references public.quote_catalog_products(id),
  to_catalog_product_id uuid not null references public.quote_catalog_products(id),
  reason text,
  reassigned_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.quote_catalog_ai_candidate_reassignments enable row level security;
drop policy if exists "staff can read ai candidate reassignments" on public.quote_catalog_ai_candidate_reassignments;
create policy "staff can read ai candidate reassignments" on public.quote_catalog_ai_candidate_reassignments
for select to authenticated using (exists (select 1 from public.staff_users s where s.user_id=auth.uid()));

do $$
declare ddl text;
begin
  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='ai_research_submit_candidate'
    and pg_get_function_identity_arguments(p.oid) like 'p_run_id uuid%';
  if ddl is null then raise exception 'ai_research_submit_candidate not found'; end if;
  ddl := replace(ddl, E' if p_variant_match=''mismatch'' or p_package_match=''mismatch'' then raise exception ''Mismatched variants/packages cannot enter review queue''; end if;', '');
  execute ddl;
end $$;

create or replace function public.reassign_ai_candidate(p_candidate_id uuid,p_target_catalog_product_id uuid,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.quote_catalog_ai_candidates%rowtype; v_from uuid;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid()) then raise exception 'Staff access required'; end if;
 select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
 if not found then raise exception 'Candidate not found'; end if;
 if c.decision<>'pending' then raise exception 'Only pending candidates can be reassigned'; end if;
 if c.applied_at is not null then raise exception 'Applied candidates cannot be reassigned'; end if;
 if not exists(select 1 from public.quote_catalog_products p where p.id=p_target_catalog_product_id) then raise exception 'Target catalogue product not found'; end if;
 if c.catalog_product_id=p_target_catalog_product_id then raise exception 'Candidate is already attached to that catalogue product'; end if;
 v_from:=c.catalog_product_id;
 update public.quote_catalog_ai_candidates
 set original_catalog_product_id=coalesce(original_catalog_product_id,c.catalog_product_id),
     catalog_product_id=p_target_catalog_product_id,reassigned_at=now(),reassigned_by=auth.uid(),
     reassignment_reason=nullif(btrim(coalesce(p_reason,'')),''),reviewed_at=null,reviewed_by=null
 where id=p_candidate_id;
 insert into public.quote_catalog_ai_candidate_reassignments(candidate_id,from_catalog_product_id,to_catalog_product_id,reason,reassigned_by)
 values(p_candidate_id,v_from,p_target_catalog_product_id,nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
 return jsonb_build_object('candidate_id',p_candidate_id,'from_catalog_product_id',v_from,'to_catalog_product_id',p_target_catalog_product_id);
end $$;
grant execute on function public.reassign_ai_candidate(uuid,uuid,text) to authenticated;