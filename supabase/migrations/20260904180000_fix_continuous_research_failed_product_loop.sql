-- Prevent continuous catalogue research from immediately re-selecting a product
-- that has just completed or failed, and record a terminal timestamp for every
-- queue attempt so retry cooldowns work reliably.

-- Historical queue rows created before this fix did not always receive a terminal
-- timestamp on failure. Backfill terminal rows so they are not immediately eligible
-- for another continuous run.
update public.quote_catalog_ai_queue
set completed_at = coalesce(completed_at, finished_at, claimed_at, now()),
    finished_at = coalesce(finished_at, completed_at, claimed_at, now())
where status in ('completed','failed')
  and (completed_at is null or finished_at is null);

-- A queue item is one attempt. Claiming increments attempts, so completion must not
-- increment it again. Both success and failure receive terminal timestamps.
create or replace function public.ai_research_complete_queue_item(
  p_queue_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path=public
as $$
begin
  update public.quote_catalog_ai_queue
  set status = case when p_success then 'completed' else 'failed' end,
      completed_at = now(),
      finished_at = now(),
      last_error = case when p_success then null else p_error end
  where id = p_queue_id;
end
$$;

-- Continuous mode must use an actual terminal timestamp. Failed products are placed
-- behind a 24-hour cooldown so the worker progresses to another catalogue product
-- instead of looping indefinitely on the same product.
create or replace function public.ai_research_enqueue_next_continuous()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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
    select
      p.id,
      p.manufacturer,
      p.model,
      p.package_name,
      count(rp.id) as evidence_count,
      max(rp.checked_at) as last_checked,
      max(ca.created_at) as last_ai_research,
      max(coalesce(q.finished_at,q.completed_at,q.claimed_at))
        filter (
          where r.notes like 'continuous-research:%'
            and q.status in ('completed','failed')
        ) as last_continuous_attempt
    from public.quote_catalog_products p
    left join public.quote_catalog_retailer_prices rp
      on rp.catalog_product_id=p.id
    left join public.quote_catalog_ai_candidates ca
      on ca.catalog_product_id=p.id
    left join public.quote_catalog_ai_queue q
      on q.catalog_product_id=p.id
    left join public.quote_catalog_ai_research_runs r
      on r.id=q.run_id
    where (c.manufacturer is null or p.manufacturer=c.manufacturer)
      and (c.category is null or p.category=c.category or p.main_category=c.category)
      and (c.product_type is null or p.product_type=c.product_type)
    group by p.id,p.manufacturer,p.model,p.package_name
  )
  select
    id,
    trim(
      concat_ws(' ',manufacturer,model,
        case
          when package_name is null or btrim(package_name)='' then null
          when lower(btrim(package_name))=lower(trim(concat_ws(' ',manufacturer,model))) then null
          when lower(btrim(package_name)) like lower(trim(concat_ws(' ',manufacturer,model))) || '%' then
            btrim(substr(btrim(package_name),length(trim(concat_ws(' ',manufacturer,model)))+1))
          when model is not null and lower(btrim(package_name)) like lower(btrim(model)) || '%' then
            btrim(substr(btrim(package_name),length(btrim(model))+1))
          else package_name
        end
      )
    )
  into p_id,p_name
  from stats
  where last_continuous_attempt is null
     or last_continuous_attempt < now() - interval '24 hours'
  order by
    case when c.mode='low_evidence' then evidence_count end asc nulls first,
    case when c.mode='low_evidence' then coalesce(last_ai_research,'epoch'::timestamptz) end asc,
    case when c.mode='oldest_checked' then coalesce(last_checked,'epoch'::timestamptz) end asc,
    case when c.mode='oldest_checked' then coalesce(last_ai_research,'epoch'::timestamptz) end asc,
    id
  limit 1;

  if p_id is null then
    return jsonb_build_object('enqueued',false,'reason','no_eligible_products');
  end if;

  insert into public.quote_catalog_ai_research_runs(
    status,started_at,products_targeted,products_checked,candidates_found,
    observations_added,flagged_for_review,errors_count,notes,evidence_scope
  )
  values(
    'queued',now(),1,0,0,0,0,0,
    'continuous-research:'||c.mode,
    c.evidence_scope
  )
  returning id into r_id;

  insert into public.quote_catalog_ai_queue(
    run_id,catalog_product_id,priority,status,attempts,available_at,created_at
  )
  values(r_id,p_id,100,'queued',0,now(),now());

  return jsonb_build_object(
    'enqueued',true,
    'run_id',r_id,
    'product_id',p_id,
    'product_name',p_name,
    'mode',c.mode,
    'evidence_scope',c.evidence_scope
  );
end
$$;

revoke all on function public.ai_research_enqueue_next_continuous() from public,anon,authenticated;
grant execute on function public.ai_research_enqueue_next_continuous() to service_role;
