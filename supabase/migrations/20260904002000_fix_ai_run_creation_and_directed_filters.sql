-- Fix AI research run creation for secure server-side Edge Function execution.
-- The Edge Function authenticates the staff user before using service_role.
-- auth.uid() is therefore not available inside the service-role RPC call.

create or replace function public.ai_research_create_run(
  p_limit integer default 25,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_run uuid;
begin
  insert into public.quote_catalog_ai_research_runs(status,products_targeted,notes)
  values ('queued',0,p_notes) returning id into v_run;

  insert into public.quote_catalog_ai_queue(run_id,catalog_product_id,priority,status)
  select v_run,p.id,100,'queued'
  from public.quote_catalog_products p
  where p.active=true
  order by p.updated_at asc nulls first,p.created_at asc nulls first
  limit greatest(1,least(coalesce(p_limit,25),100));

  update public.quote_catalog_ai_research_runs
  set products_targeted=(select count(*) from public.quote_catalog_ai_queue q where q.run_id=v_run)
  where id=v_run;
  return v_run;
end $$;

create or replace function public.ai_research_create_run_filtered(
  p_limit integer default 25,
  p_notes text default null,
  p_manufacturer text default null,
  p_model text default null,
  p_category text default null,
  p_product_type text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_run uuid;
begin
  insert into public.quote_catalog_ai_research_runs(status,products_targeted,notes)
  values ('queued',0,p_notes) returning id into v_run;

  insert into public.quote_catalog_ai_queue(run_id,catalog_product_id,priority,status)
  select v_run,p.id,100,'queued'
  from public.quote_catalog_products p
  where p.active=true
    and (nullif(btrim(p_manufacturer),'') is null or lower(p.manufacturer)=lower(btrim(p_manufacturer)))
    and (nullif(btrim(p_model),'') is null or lower(p.model) like '%'||lower(btrim(p_model))||'%')
    and (nullif(btrim(p_category),'') is null or lower(coalesce(p.category,''))=lower(btrim(p_category)))
    and (nullif(btrim(p_product_type),'') is null or lower(coalesce(p.product_type,''))=lower(btrim(p_product_type)))
  order by p.updated_at asc nulls first,p.created_at asc nulls first
  limit greatest(1,least(coalesce(p_limit,25),100));

  update public.quote_catalog_ai_research_runs
  set products_targeted=(select count(*) from public.quote_catalog_ai_queue q where q.run_id=v_run)
  where id=v_run;
  return v_run;
end $$;

revoke all on function public.ai_research_create_run(integer,text) from public,anon,authenticated;
revoke all on function public.ai_research_create_run_filtered(integer,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.ai_research_create_run(integer,text) to service_role;
grant execute on function public.ai_research_create_run_filtered(integer,text,text,text,text,text) to service_role;