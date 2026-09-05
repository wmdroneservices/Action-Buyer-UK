-- Preserve Amazon UK Only in continuous research.
create or replace function public.ai_research_set_continuous(
  p_enabled boolean,
  p_mode text default 'low_evidence',
  p_evidence_scope text default 'all',
  p_manufacturer text default null,
  p_category text default null,
  p_product_type text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mode text:=case when p_mode in ('low_evidence','oldest_checked') then p_mode else 'low_evidence' end;
  v_scope text:=case when p_evidence_scope in ('all','new_uk','used_uk','overseas','amazon_uk') then p_evidence_scope else 'all' end;
begin
  if p_enabled then
    insert into public.quote_catalog_ai_continuous_control(id,enabled,mode,evidence_scope,manufacturer,category,product_type,started_at,stopped_at,started_by,updated_at)
    values(true,true,v_mode,v_scope,nullif(trim(coalesce(p_manufacturer,'')),''),nullif(trim(coalesce(p_category,'')),''),nullif(trim(coalesce(p_product_type,'')),''),now(),null,auth.uid(),now())
    on conflict(id) do update set
      enabled=true,mode=excluded.mode,evidence_scope=excluded.evidence_scope,
      manufacturer=excluded.manufacturer,category=excluded.category,product_type=excluded.product_type,
      started_at=now(),stopped_at=null,started_by=auth.uid(),updated_at=now();
  else
    update public.quote_catalog_ai_continuous_control set enabled=false,stopped_at=now(),updated_at=now() where id=true;
    delete from public.quote_catalog_ai_queue q using public.quote_catalog_ai_research_runs r
      where q.run_id=r.id and r.notes like 'continuous-research:%' and q.status='queued';
    update public.quote_catalog_ai_research_runs
      set status='cancelled',finished_at=now(),notes=notes||' | stopped from dashboard'
      where notes like 'continuous-research:%' and status in ('queued','running');
  end if;
  return (select jsonb_build_object('enabled',enabled,'mode',mode,'evidence_scope',evidence_scope,'manufacturer',manufacturer,'category',category,'product_type',product_type,'started_at',started_at,'stopped_at',stopped_at,'updated_at',updated_at)
          from public.quote_catalog_ai_continuous_control where id=true);
end
$$;
