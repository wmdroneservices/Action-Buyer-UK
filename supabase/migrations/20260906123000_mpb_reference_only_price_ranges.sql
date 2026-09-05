-- MPB UK exact product pages are used-market reference ranges, not one evidence row per SKU.
-- Applied to production on 2026-09-06.

alter table public.quote_catalog_ai_candidates
  add column if not exists reference_price_min numeric,
  add column if not exists reference_price_max numeric,
  add column if not exists observed_conditions text,
  add column if not exists observed_units_count integer,
  add column if not exists reference_only boolean not null default false,
  add column if not exists edited_reference_price_min numeric,
  add column if not exists edited_reference_price_max numeric,
  add column if not exists edited_observed_conditions text;

alter table public.quote_catalog_retailer_prices
  add column if not exists reference_price_min numeric,
  add column if not exists reference_price_max numeric,
  add column if not exists reference_conditions text,
  add column if not exists reference_units_observed integer,
  add column if not exists reference_only boolean not null default false;

drop function if exists public.ai_research_submit_candidate(
 uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,numeric,text,text,text,text,text,text,text,text
);

create function public.ai_research_submit_candidate(
 p_run_id uuid,p_catalog_product_id uuid,p_source_id uuid,p_source_url text,
 p_discovered_title text,p_discovered_model_number text,p_identifier_type text,p_identifier_value text,
 p_price numeric,p_currency text,p_price_type text,p_condition text,p_availability_status text,
 p_match_confidence numeric,p_match_method text,p_evidence_category text,p_market_region text,
 p_source_country_code text,p_source_kind text,p_package_match text,p_variant_match text,p_evidence_notes text,
 p_reference_price_min numeric default null,p_reference_price_max numeric default null,
 p_observed_conditions text default null,p_observed_units_count integer default null,p_reference_only boolean default false
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_bucket smallint; v_category text; v_condition text; v_currency text; v_country text;
begin
 if not exists(select 1 from public.quote_catalog_ai_research_runs r where r.id=p_run_id) then raise exception 'Unknown research run'; end if;
 if p_match_confidence is null or p_match_confidence<0 or p_match_confidence>1 then raise exception 'Invalid match confidence'; end if;
 if p_variant_match not in ('exact','compatible','uncertain','mismatch') or p_package_match not in ('exact','compatible','uncertain','mismatch') then raise exception 'Invalid match status'; end if;
 if p_variant_match='mismatch' or p_package_match='mismatch' then raise exception 'Mismatched variants/packages cannot enter review queue'; end if;
 if p_reference_price_min is not null and p_reference_price_min<0 then raise exception 'Invalid reference minimum'; end if;
 if p_reference_price_max is not null and p_reference_price_max<0 then raise exception 'Invalid reference maximum'; end if;
 if p_reference_price_min is not null and p_reference_price_max is not null and p_reference_price_max<p_reference_price_min then raise exception 'Reference maximum cannot be below minimum'; end if;
 v_condition:=lower(coalesce(p_condition,'unknown'));
 v_currency:=upper(coalesce(nullif(trim(p_currency),''),'GBP'));
 v_country:=upper(coalesce(trim(p_source_country_code),''));
 v_category:=case
   when v_currency<>'GBP' then 'overseas'
   when v_country<>'' and v_country<>'GB' then 'overseas'
   when v_country='GB' and p_source_kind in ('marketplace','auction') then 'used_uk'
   else p_evidence_category
 end;
 if v_category not in ('new_uk','used_uk','overseas','official') then
   v_category:=case when v_currency='GBP' and (v_country='' or v_country='GB') then 'used_uk' else 'overseas' end;
 end if;
 v_bucket:=case when v_category='new_uk' then 1 when v_category='used_uk' then 2 when v_category='overseas' then 3 else null end;
 insert into public.quote_catalog_ai_candidates(
   run_id,catalog_product_id,source_id,source_url,discovered_title,discovered_model_number,
   discovered_identifier_type,discovered_identifier_value,price,currency,price_type,condition,
   availability_status,match_confidence,match_method,decision,evidence_category,evidence_bucket,
   market_region,source_country_code,source_kind,package_match,variant_match,evidence_notes,
   original_price,original_currency,reference_price_min,reference_price_max,observed_conditions,
   observed_units_count,reference_only
 ) values(
   p_run_id,p_catalog_product_id,p_source_id,p_source_url,p_discovered_title,p_discovered_model_number,
   p_identifier_type,p_identifier_value,coalesce(p_reference_price_min,p_price),v_currency,v_category,v_condition,
   p_availability_status,p_match_confidence,p_match_method,'pending',v_category,v_bucket,
   case when v_category='overseas' then 'overseas' else p_market_region end,
   p_source_country_code,p_source_kind,p_package_match,p_variant_match,p_evidence_notes,
   coalesce(p_reference_price_min,p_price),v_currency,p_reference_price_min,p_reference_price_max,
   p_observed_conditions,p_observed_units_count,coalesce(p_reference_only,false)
 ) returning id into v_id;
 update public.quote_catalog_ai_research_runs
 set candidates_found=candidates_found+1,flagged_for_review=flagged_for_review+1
 where id=p_run_id;
 return v_id;
end $$;

create or replace function public.apply_accepted_ai_candidate(p_candidate_id uuid)
returns uuid language plpgsql as $$
declare
  c public.quote_catalog_ai_candidates%rowtype;
  evidence_id uuid; v_retailer text; v_category text; v_price_type text; v_condition text;
  v_price numeric; v_currency text; v_availability text; v_region text; v_notes text;
  v_ref_min numeric; v_ref_max numeric; v_ref_conditions text; v_ref_units integer; v_reference_only boolean;
begin
  select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  if c.decision <> 'accepted' then raise exception 'Candidate must be accepted before applying'; end if;
  if c.applied_evidence_id is not null then return c.applied_evidence_id; end if;
  select coalesce(nullif(s.source_name,''),nullif(s.domain,'')) into v_retailer from public.quote_catalog_ai_sources s where s.id=c.source_id;
  v_retailer:=coalesce(nullif(v_retailer,''),nullif(split_part(regexp_replace(coalesce(c.edited_source_url,c.source_url,''), '^https?://', ''), '/', 1),''),'AI reviewed source');
  v_category:=lower(coalesce(nullif(c.edited_evidence_category,''),nullif(c.evidence_category,''),nullif(c.price_type,''),'marketplace'));
  v_condition:=coalesce(nullif(c.edited_condition,''),nullif(c.condition,''),'Unknown');
  v_ref_min:=coalesce(c.edited_reference_price_min,c.reference_price_min);
  v_ref_max:=coalesce(c.edited_reference_price_max,c.reference_price_max);
  v_ref_conditions:=coalesce(nullif(c.edited_observed_conditions,''),nullif(c.observed_conditions,''));
  v_ref_units:=c.observed_units_count;
  v_reference_only:=coalesce(c.reference_only,false);
  v_price:=coalesce(v_ref_min,c.edited_price,c.price);
  v_currency:=upper(coalesce(nullif(c.edited_currency,''),nullif(c.currency,''),'GBP'));
  v_region:=case when v_category in ('new_uk','used_uk') then 'UK' else 'International' end;
  v_price_type:=case when v_category='new_uk' then 'new' when v_category='used_uk' then 'used' else 'market' end;
  v_availability:=case lower(replace(coalesce(c.edited_availability_status,c.availability_status,''),' ','_'))
    when 'in_stock' then 'in_stock' when 'instock' then 'in_stock' when 'out_of_stock' then 'out_of_stock'
    when 'outofstock' then 'out_of_stock' when '' then 'unknown' else 'unknown' end;
  v_notes:=concat('AI-reviewed evidence | ',v_category,' | ',coalesce(c.edited_title,c.discovered_title,''),
    case when v_reference_only then ' | Reference only — does not affect automatic pricing' else '' end,
    case when v_ref_min is not null then ' | From: '||v_ref_min else '' end,
    case when v_ref_max is not null then ' | To: '||v_ref_max else '' end,
    case when v_ref_conditions is not null then ' | Conditions: '||v_ref_conditions else '' end,
    case when v_ref_units is not null then ' | Units observed: '||v_ref_units else '' end,
    case when coalesce(c.edited_evidence_notes,c.evidence_notes) is not null then ' | Notes: '||coalesce(c.edited_evidence_notes,c.evidence_notes) else '' end);
  insert into public.quote_catalog_retailer_prices
    (catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes,price_type,availability_status,price_currency,price_region,evidence_region,reference_price_min,reference_price_max,reference_conditions,reference_units_observed,reference_only)
  values (c.catalog_product_id,v_retailer,v_condition,v_price,now(),coalesce(c.edited_source_url,c.source_url),v_notes,v_price_type,v_availability,v_currency,v_region,v_region,v_ref_min,v_ref_max,v_ref_conditions,v_ref_units,v_reference_only)
  on conflict do nothing returning id into evidence_id;
  if evidence_id is null then
    select id into evidence_id from public.quote_catalog_retailer_prices
    where catalog_product_id=c.catalog_product_id and lower(trim(coalesce(retailer,'')))=lower(trim(v_retailer))
      and lower(trim(coalesce(condition,'')))=lower(trim(v_condition))
      and coalesce(sell_price,-1)=coalesce(v_price,-1)
      and lower(trim(coalesce(source_url,'')))=lower(trim(coalesce(c.edited_source_url,c.source_url,'')))
      and upper(coalesce(price_currency,''))=v_currency
    order by updated_at desc nulls last,created_at desc nulls last limit 1;
  end if;
  if evidence_id is null then raise exception 'Accepted candidate could not be linked to a live evidence row'; end if;
  update public.quote_catalog_ai_candidates set applied_at=now(),applied_evidence_id=evidence_id where id=p_candidate_id;
  return evidence_id;
end $$;
