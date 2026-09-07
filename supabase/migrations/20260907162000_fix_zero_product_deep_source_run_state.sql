-- Live migration mirror: zero-product Deep Source runs are terminal and must not lock the dashboard.
create or replace function public.ai_research_create_deep_source_run(
  p_limit integer default 5,p_notes text default null,p_manufacturer text default null,p_model text default null,p_category text default null,p_product_type text default null,p_deep_source_url text default null
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_run uuid; v_url text:=nullif(btrim(coalesce(p_deep_source_url,'')),''); v_domain text; v_limit integer; v_count integer:=0;
begin
  if v_url is null or v_url !~* '^https?://' then raise exception 'A valid Deep Source landing page URL is required.'; end if;
  if coalesce(p_limit,5)<=0 and nullif(btrim(coalesce(p_manufacturer,'')),'') is null and nullif(btrim(coalesce(p_model,'')),'') is null and nullif(btrim(coalesce(p_category,'')),'') is null and nullif(btrim(coalesce(p_product_type,'')),'') is null then raise exception 'ALL matching products requires at least one product filter.'; end if;
  v_domain:=lower(regexp_replace(regexp_replace(v_url,'^https?://','','i'),'/.*$',''));
  v_domain:=regexp_replace(v_domain,'^www\\.','','i');
  v_limit:=case when coalesce(p_limit,5)<=0 then null else greatest(1,least(p_limit,500)) end;
  insert into public.quote_catalog_ai_research_runs(status,products_targeted,notes,evidence_scope,deep_source_url,deep_source_domain)
  values('queued',0,coalesce(p_notes,'Deep Source Audit: '||v_url),'deep_source',v_url,v_domain) returning id into v_run;
  insert into public.quote_catalog_ai_queue(run_id,catalog_product_id,priority,status)
  select v_run,p.id,100,'queued' from public.quote_catalog_products p
  where p.active=true
    and (nullif(btrim(p_manufacturer),'') is null or lower(p.manufacturer)=lower(btrim(p_manufacturer)))
    and (nullif(btrim(p_model),'') is null or lower(p.model) like '%'||lower(btrim(p_model))||'%')
    and (nullif(btrim(p_category),'') is null or lower(coalesce(p.category,''))=lower(btrim(p_category)))
    and (nullif(btrim(p_product_type),'') is null or lower(coalesce(p.product_type,''))=lower(btrim(p_product_type)))
  order by p.updated_at asc nulls first,p.created_at asc nulls first limit v_limit;
  select count(*)::integer into v_count from public.quote_catalog_ai_queue where run_id=v_run;
  update public.quote_catalog_ai_research_runs
  set products_targeted=v_count,
      status=case when v_count=0 then 'completed' else status end,
      finished_at=case when v_count=0 then now() else finished_at end,
      notes=case when v_count=0 then trim(coalesce(notes,'') || case when coalesce(notes,'')='' then '' else ' | ' end || 'no matching active catalogue products') else notes end
  where id=v_run;
  return v_run;
end $$;

update public.quote_catalog_ai_research_runs r
set status='completed',finished_at=coalesce(r.finished_at,now()),
    notes=trim(coalesce(r.notes,'') || case when coalesce(r.notes,'')='' then '' else ' | ' end || 'reconciled zero-product Deep Source run')
where r.evidence_scope='deep_source' and r.status in ('queued','running') and coalesce(r.products_targeted,0)=0
  and not exists(select 1 from public.quote_catalog_ai_queue q where q.run_id=r.id);
