-- Non-GBP evidence is always overseas comparison evidence.
-- This is enforced at the database boundary so AI/model labels cannot put
-- USD/EUR/CAD/etc. listings into UK New or UK Used evidence.

create or replace function public.ai_research_submit_candidate(
  p_run_id uuid,p_catalog_product_id uuid,p_source_id uuid,p_source_url text,
  p_discovered_title text,p_discovered_model_number text,p_identifier_type text,p_identifier_value text,
  p_price numeric,p_currency text,p_price_type text,p_condition text,p_availability_status text,
  p_match_confidence numeric,p_match_method text,p_evidence_category text,p_market_region text,
  p_source_country_code text,p_source_kind text,p_package_match text,p_variant_match text,p_evidence_notes text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_bucket smallint; v_category text; v_condition text; v_currency text; v_country text;
begin
 if not exists(select 1 from public.quote_catalog_ai_research_runs r where r.id=p_run_id) then raise exception 'Unknown research run'; end if;
 if p_match_confidence is null or p_match_confidence<0 or p_match_confidence>1 then raise exception 'Invalid match confidence'; end if;
 if p_variant_match not in ('exact','compatible','uncertain','mismatch') or p_package_match not in ('exact','compatible','uncertain','mismatch') then raise exception 'Invalid match status'; end if;
 if p_variant_match='mismatch' or p_package_match='mismatch' then raise exception 'Mismatched variants/packages cannot enter review queue'; end if;

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
   original_price,original_currency
 ) values(
   p_run_id,p_catalog_product_id,p_source_id,p_source_url,p_discovered_title,p_discovered_model_number,
   p_identifier_type,p_identifier_value,p_price,v_currency,v_category,v_condition,
   p_availability_status,p_match_confidence,p_match_method,'pending',v_category,v_bucket,
   case when v_category='overseas' then 'overseas' else p_market_region end,
   p_source_country_code,p_source_kind,p_package_match,p_variant_match,p_evidence_notes,
   p_price,v_currency
 ) returning id into v_id;

 update public.quote_catalog_ai_research_runs
 set candidates_found=candidates_found+1,flagged_for_review=flagged_for_review+1
 where id=p_run_id;
 return v_id;
end $$;
