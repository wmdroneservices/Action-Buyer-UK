-- Manufacturer Batch Image Research
-- Central staff workflow for Category + Manufacturer image assignments.
-- Candidate deployment is deliberately review-first and cannot silently overwrite approved imagery.

create or replace function public.staff_retail_image_research_manufacturers(
  p_search text default null,
  p_limit integer default 200
)
returns table(
  manufacturer text,
  target_count bigint,
  pending_count bigint,
  candidate_count bigint,
  approved_count bigint
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not exists (
    select 1 from public.staff_users s
    where s.user_id=auth.uid()
      and s.active=true
      and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)
  ) then
    raise exception 'Active Research & Pricing staff access required';
  end if;

  return query
  select q.manufacturer,
         count(*)::bigint as target_count,
         count(*) filter(where q.research_status='pending')::bigint as pending_count,
         count(*) filter(where q.research_status='candidate')::bigint as candidate_count,
         count(*) filter(where q.approved=true or q.research_status='approved')::bigint as approved_count
  from public.retail_storefront_image_queue q
  where q.entity_scope='manufacturer'
    and q.manufacturer is not null
    and btrim(q.manufacturer)<>''
    and (p_search is null or btrim(p_search)='' or q.manufacturer ilike '%'||btrim(p_search)||'%')
  group by q.manufacturer
  order by lower(q.manufacturer)
  limit greatest(1,least(coalesce(p_limit,200),500));
end;
$$;

create or replace function public.staff_retail_image_research_manufacturer_targets(
  p_manufacturer text,
  p_status text default null,
  p_limit integer default 100
)
returns table(
  id uuid,
  entity_scope text,
  category text,
  manufacturer text,
  model text,
  catalog_product_id uuid,
  image_url text,
  source_url text,
  source_name text,
  licence_status text,
  research_status text,
  approved boolean,
  notes text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not exists (
    select 1 from public.staff_users s
    where s.user_id=auth.uid()
      and s.active=true
      and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)
  ) then
    raise exception 'Active Research & Pricing staff access required';
  end if;

  if coalesce(btrim(p_manufacturer),'')='' then
    raise exception 'Manufacturer is required';
  end if;

  return query
  select q.id,q.entity_scope,q.category,q.manufacturer,q.model,q.catalog_product_id,
         q.image_url,q.source_url,q.source_name,q.licence_status,q.research_status,
         q.approved,q.notes,q.updated_at
  from public.retail_storefront_image_queue q
  where q.entity_scope='manufacturer'
    and q.manufacturer=p_manufacturer
    and (p_status is null or btrim(p_status)='' or q.research_status=p_status)
  order by
    case q.research_status when 'pending' then 0 when 'candidate' then 1 when 'approved' then 2 else 3 end,
    q.category,q.entity_scope,q.model
  limit greatest(1,least(coalesce(p_limit,100),250));
end;
$$;

create or replace function public.staff_retail_image_research_batch_save(
  p_manufacturer text,
  p_assignments jsonb
)
returns table(
  id uuid,
  category text,
  result text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  a jsonb;
  q public.retail_storefront_image_queue;
  v_id uuid;
  v_category text;
begin
  if not exists (
    select 1 from public.staff_users s
    where s.user_id=auth.uid()
      and s.active=true
      and (coalesce(s.can_access_research,false)=true or coalesce(s.can_manage_staff,false)=true)
  ) then
    raise exception 'Active Research & Pricing staff access required';
  end if;

  if coalesce(btrim(p_manufacturer),'')='' then
    raise exception 'Manufacturer is required';
  end if;
  if jsonb_typeof(coalesce(p_assignments,'[]'::jsonb))<>'array' then
    raise exception 'Assignments must be a JSON array';
  end if;

  for a in select value from jsonb_array_elements(coalesce(p_assignments,'[]'::jsonb))
  loop
    v_id=nullif(a->>'queue_id','')::uuid;
    v_category=coalesce(nullif(btrim(a->>'category'),''),null);

    select * into q
    from public.retail_storefront_image_queue q0
    where q0.id=v_id
    for update;

    if q.id is null then
      raise exception 'Image research record % not found',v_id;
    end if;
    if q.manufacturer is distinct from p_manufacturer then
      raise exception 'Manufacturer mismatch for record %: expected %, found %',v_id,p_manufacturer,q.manufacturer;
    end if;
    if q.category is distinct from v_category then
      raise exception 'Category mismatch for record %: expected %, found %',v_id,v_category,q.category;
    end if;
    if q.approved=true or q.research_status='approved' then
      raise exception 'Approved imagery cannot be overwritten by batch research for % / %',q.manufacturer,coalesce(q.category,'');
    end if;

    update public.retail_storefront_image_queue
    set image_url=nullif(btrim(a->>'image_url'),''),
        source_url=nullif(btrim(a->>'source_url'),''),
        source_name=nullif(btrim(a->>'source_name'),''),
        licence_status=coalesce(nullif(btrim(a->>'licence_status'),''),'unverified'),
        research_status='candidate',
        approved=false,
        notes=nullif(btrim(a->>'notes'),''),
        updated_at=now()
    where id=q.id;

    id=q.id;
    category=q.category;
    result='saved_candidate';
    return next;
  end loop;
end;
$$;