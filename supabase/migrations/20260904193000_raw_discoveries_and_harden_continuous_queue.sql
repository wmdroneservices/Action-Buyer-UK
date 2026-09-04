-- Persist raw web discoveries and harden continuous research selection.
-- Raw discoveries are shown separately from validated pricing evidence.

create table if not exists public.quote_catalog_ai_discoveries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quote_catalog_ai_research_runs(id) on delete cascade,
  catalog_product_id uuid not null references public.quote_catalog_products(id) on delete cascade,
  queue_id uuid null references public.quote_catalog_ai_queue(id) on delete set null,
  evidence_scope text not null default 'all',
  source_url text not null,
  host text,
  discovered_title text,
  source_provider text,
  discovery_status text not null default 'found',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, source_url)
);

create index if not exists quote_catalog_ai_discoveries_recent_idx
  on public.quote_catalog_ai_discoveries(created_at desc);
create index if not exists quote_catalog_ai_discoveries_product_idx
  on public.quote_catalog_ai_discoveries(catalog_product_id, created_at desc);

create or replace function public.ai_research_recent_discoveries(p_limit integer default 60)
returns jsonb
language sql
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  from (
    select d.*,p.manufacturer,p.model,p.package_name
    from public.quote_catalog_ai_discoveries d
    join public.quote_catalog_products p on p.id=d.catalog_product_id
    order by d.created_at desc
    limit greatest(1,least(coalesce(p_limit,60),200))
  ) x;
$$;

create or replace function public.ai_research_enqueue_next_continuous()
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  c public.quote_catalog_ai_continuous_control%rowtype;
  p_id uuid;
  r_id uuid;
  p_name text;
begin
  select * into c
  from public.quote_catalog_ai_continuous_control
  where id=true
  for update;

  if not found or not c.enabled then
    return jsonb_build_object('enqueued',false,'reason','disabled');
  end if;

  if exists(
    select 1
    from public.quote_catalog_ai_queue q
    join public.quote_catalog_ai_research_runs r on r.id=q.run_id
    where r.notes like 'continuous-research:%'
      and q.status in ('queued','claimed','processing')
  ) then
    return jsonb_build_object('enqueued',false,'reason','already_pending');
  end if;

  with stats as (
    select p.id,p.manufacturer,p.model,p.package_name,
      count(rp.id) as evidence_count,
      max(rp.checked_at) as last_checked,
      max(ca.created_at) as last_ai_research
    from public.quote_catalog_products p
    left join public.quote_catalog_retailer_prices rp on rp.catalog_product_id=p.id
    left join public.quote_catalog_ai_candidates ca on ca.catalog_product_id=p.id
    where (c.manufacturer is null or p.manufacturer=c.manufacturer)
      and (c.category is null or p.category=c.category or p.main_category=c.category)
      and (c.product_type is null or p.product_type=c.product_type)
    group by p.id,p.manufacturer,p.model,p.package_name
  )
  select s.id,trim(concat_ws(' ',s.manufacturer,s.model,s.package_name))
  into p_id,p_name
  from stats s
  where not exists (
    select 1
    from public.quote_catalog_ai_queue q2
    join public.quote_catalog_ai_research_runs r2 on r2.id=q2.run_id
    where q2.catalog_product_id=s.id
      and r2.notes like 'continuous-research:%'
      and coalesce(q2.finished_at,q2.completed_at,q2.claimed_at,q2.created_at) >= now() - interval '24 hours'
  )
  order by
    case when c.mode='low_evidence' then s.evidence_count end asc nulls first,
    case when c.mode='low_evidence' then coalesce(s.last_ai_research,'epoch'::timestamptz) end asc,
    case when c.mode='oldest_checked' then coalesce(s.last_checked,'epoch'::timestamptz) end asc,
    case when c.mode='oldest_checked' then coalesce(s.last_ai_research,'epoch'::timestamptz) end asc,
    s.id
  limit 1;

  if p_id is null then
    return jsonb_build_object('enqueued',false,'reason','no_eligible_products');
  end if;

  insert into public.quote_catalog_ai_research_runs(
    status,started_at,products_targeted,products_checked,candidates_found,
    observations_added,flagged_for_review,errors_count,notes,evidence_scope
  )
  values('queued',now(),1,0,0,0,0,0,'continuous-research:'||c.mode,c.evidence_scope)
  returning id into r_id;

  insert into public.quote_catalog_ai_queue(
    run_id,catalog_product_id,priority,status,attempts,available_at,created_at
  )
  values(r_id,p_id,100,'queued',0,now(),now());

  return jsonb_build_object(
    'enqueued',true,'run_id',r_id,'product_id',p_id,'product_name',p_name,
    'mode',c.mode,'evidence_scope',c.evidence_scope
  );
end
$function$;