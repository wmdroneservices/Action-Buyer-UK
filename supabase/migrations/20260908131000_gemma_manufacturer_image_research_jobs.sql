-- Gemma manufacturer/category batch image research.
-- Central image workflow remains separate from catalogue pricing evidence.

create table if not exists public.retail_storefront_image_research_jobs (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','completed_with_errors','cancelled','failed')),
  requested_limit integer not null default 10 check (requested_limit between 1 and 100),
  requested_by uuid null,
  notes text null,
  targets_total integer not null default 0,
  targets_completed integer not null default 0,
  targets_with_candidate integer not null default 0,
  targets_without_candidate integer not null default 0,
  targets_failed integer not null default 0,
  started_at timestamptz null,
  completed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retail_storefront_image_research_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.retail_storefront_image_research_jobs(id) on delete cascade,
  queue_id uuid not null references public.retail_storefront_image_queue(id) on delete cascade,
  manufacturer text not null,
  category text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','no_candidate','failed','cancelled')),
  attempts integer not null default 0,
  image_url text null,
  source_url text null,
  source_name text null,
  licence_status text null,
  confidence numeric null,
  notes text null,
  error_message text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id,queue_id)
);

create index if not exists retail_storefront_image_research_jobs_status_idx on public.retail_storefront_image_research_jobs(status,created_at);
create index if not exists retail_storefront_image_research_job_items_status_idx on public.retail_storefront_image_research_job_items(status,created_at);

alter table public.retail_storefront_image_research_jobs enable row level security;
alter table public.retail_storefront_image_research_job_items enable row level security;

create or replace function public.staff_image_research_create_manufacturer_job(
  p_manufacturer text,
  p_limit integer default 10,
  p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_manufacturer text := btrim(coalesce(p_manufacturer,''));
  v_limit integer := greatest(1,least(coalesce(p_limit,10),100));
  v_job uuid;
  v_count integer := 0;
begin
  if not exists (select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)) then
    raise exception 'Active Research & Pricing staff access required';
  end if;
  if v_manufacturer='' then raise exception 'Manufacturer is required'; end if;

  insert into public.retail_storefront_image_research_jobs(manufacturer,requested_limit,requested_by,notes,status)
  values(v_manufacturer,v_limit,auth.uid(),nullif(btrim(p_notes),''),'queued')
  returning id into v_job;

  insert into public.retail_storefront_image_research_job_items(job_id,queue_id,manufacturer,category,status)
  select v_job,q.id,q.manufacturer,q.category,'queued'
  from public.retail_storefront_image_queue q
  where q.entity_scope='manufacturer'
    and lower(btrim(coalesce(q.manufacturer,'')))=lower(v_manufacturer)
    and nullif(btrim(q.category),'') is not null
    and coalesce(q.approved,false)=false
    and coalesce(q.research_status,'pending') in ('pending','candidate')
  order by case q.research_status when 'pending' then 0 when 'candidate' then 1 else 2 end,q.updated_at asc nulls first,q.category
  limit v_limit;

  get diagnostics v_count=row_count;

  update public.retail_storefront_image_research_jobs
  set targets_total=v_count,status=case when v_count=0 then 'completed' else 'queued' end,
      completed_at=case when v_count=0 then now() else null end,updated_at=now()
  where id=v_job;

  return jsonb_build_object('job_id',v_job,'manufacturer',v_manufacturer,'targets_total',v_count,'status',case when v_count=0 then 'completed' else 'queued' end);
end;
$$;

create or replace function public.staff_image_research_manufacturer_jobs(p_limit integer default 20)
returns table(id uuid,manufacturer text,status text,requested_limit integer,targets_total integer,targets_completed integer,targets_with_candidate integer,targets_without_candidate integer,targets_failed integer,notes text,last_error text,created_at timestamptz,started_at timestamptz,completed_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists (select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)) then
    raise exception 'Active Research & Pricing staff access required';
  end if;
  return query
  select j.id,j.manufacturer,j.status,j.requested_limit,j.targets_total,j.targets_completed,j.targets_with_candidate,j.targets_without_candidate,j.targets_failed,j.notes,j.last_error,j.created_at,j.started_at,j.completed_at
  from public.retail_storefront_image_research_jobs j
  order by j.created_at desc
  limit greatest(1,least(coalesce(p_limit,20),100));
end;
$$;

create or replace function public.staff_image_research_manufacturers(
  p_search text default null,
  p_limit integer default 250
) returns table(manufacturer text,targets_total bigint,targets_pending bigint,targets_candidate bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists (select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)) then
    raise exception 'Active Research & Pricing staff access required';
  end if;
  return query
  select q.manufacturer,count(*)::bigint,
         count(*) filter(where q.research_status='pending' and q.approved=false)::bigint,
         count(*) filter(where q.research_status='candidate' and q.approved=false)::bigint
  from public.retail_storefront_image_queue q
  where q.entity_scope='manufacturer'
    and nullif(btrim(q.manufacturer),'') is not null
    and (p_search is null or btrim(p_search)='' or q.manufacturer ilike '%'||btrim(p_search)||'%')
  group by q.manufacturer
  order by lower(q.manufacturer)
  limit greatest(1,least(coalesce(p_limit,250),1000));
end;
$$;

create or replace function public.increment_image_research_job_progress(
  p_job_id uuid,
  p_result text,
  p_error text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.retail_storefront_image_research_jobs;
begin
  if p_result not in ('candidate','no_candidate','failed') then raise exception 'Invalid image research result'; end if;

  update public.retail_storefront_image_research_jobs
  set targets_completed=targets_completed+1,
      targets_with_candidate=targets_with_candidate+case when p_result='candidate' then 1 else 0 end,
      targets_without_candidate=targets_without_candidate+case when p_result='no_candidate' then 1 else 0 end,
      targets_failed=targets_failed+case when p_result='failed' then 1 else 0 end,
      last_error=case when p_result='failed' then coalesce(p_error,last_error) else last_error end,
      updated_at=now()
  where id=p_job_id returning * into v_job;

  if v_job.id is null then raise exception 'Image research job not found'; end if;

  if v_job.targets_completed>=v_job.targets_total then
    update public.retail_storefront_image_research_jobs
    set status=case when targets_failed>0 then 'completed_with_errors' else 'completed' end,
        completed_at=now(),updated_at=now()
    where id=p_job_id returning * into v_job;
  end if;

  return jsonb_build_object('job_id',v_job.id,'status',v_job.status,'completed',v_job.targets_completed,'total',v_job.targets_total,'with_candidate',v_job.targets_with_candidate,'without_candidate',v_job.targets_without_candidate,'failed',v_job.targets_failed);
end;
$$;

revoke all on function public.staff_image_research_create_manufacturer_job(text,integer,text) from public;
revoke all on function public.staff_image_research_manufacturer_jobs(integer) from public;
revoke all on function public.staff_image_research_manufacturers(text,integer) from public;
revoke all on function public.increment_image_research_job_progress(uuid,text,text) from public;

grant execute on function public.staff_image_research_create_manufacturer_job(text,integer,text) to authenticated,service_role;
grant execute on function public.staff_image_research_manufacturer_jobs(integer) to authenticated,service_role;
grant execute on function public.staff_image_research_manufacturers(text,integer) to authenticated,service_role;
grant execute on function public.increment_image_research_job_progress(uuid,text,text) to service_role;
