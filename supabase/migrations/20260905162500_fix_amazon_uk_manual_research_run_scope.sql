-- Fix Amazon UK Only for manually started filtered research runs.
--
-- The dashboard and quote-catalog-ai-worker already pass
-- p_evidence_scope = 'amazon_uk'. The previous RPC accepted the parameter
-- but collapsed it to 'all', which widened the local worker's source scope.

create or replace function public.ai_research_create_run_filtered(
  p_limit integer default 25,
  p_notes text default null,
  p_manufacturer text default null,
  p_model text default null,
  p_category text default null,
  p_product_type text default null,
  p_evidence_scope text default 'all'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_run uuid;
  v_scope text := case
    when p_evidence_scope in ('all','new_uk','used_uk','overseas','amazon_uk')
      then p_evidence_scope
    else 'all'
  end;
begin
  insert into public.quote_catalog_ai_research_runs(
    status,products_targeted,notes,evidence_scope
  )
  values ('queued',0,p_notes,v_scope)
  returning id into v_run;

  insert into public.quote_catalog_ai_queue(
    run_id,catalog_product_id,priority,status
  )
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
  set products_targeted=(
    select count(*) from public.quote_catalog_ai_queue q where q.run_id=v_run
  )
  where id=v_run;

  return v_run;
end
$$;