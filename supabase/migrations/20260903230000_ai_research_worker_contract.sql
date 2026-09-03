-- AI research worker contract. Research results remain candidates until manual acceptance and separate application.

create or replace function public.ai_research_create_run(p_limit integer default 25, p_notes text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_run uuid; begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true) then raise exception 'Staff access required'; end if;
 insert into public.quote_catalog_ai_research_runs(status,products_targeted,notes) values ('queued',0,p_notes) returning id into v_run;
 insert into public.quote_catalog_ai_queue(run_id,catalog_product_id,priority,status)
 select v_run,p.id,100,'queued' from public.quote_catalog_products p where p.active=true
 order by p.updated_at asc nulls first,p.created_at asc nulls first limit greatest(1,least(coalesce(p_limit,25),100));
 update public.quote_catalog_ai_research_runs set products_targeted=(select count(*) from public.quote_catalog_ai_queue q where q.run_id=v_run) where id=v_run;
 return v_run;
end $$;

create or replace function public.ai_research_get_batch(p_run_id uuid, p_batch_size integer default 10)
returns table(queue_id uuid,catalog_product_id uuid,manufacturer text,model text,package_name text,identifiers jsonb,learning jsonb)
language sql security invoker set search_path=public as $$
 select q.id,q.catalog_product_id,p.manufacturer,p.model,p.package_name,
 coalesce((select jsonb_agg(jsonb_build_object('type',i.identifier_type,'value',i.identifier_value,'verified',i.verification_status,'source',i.source_name)) from public.quote_catalog_product_identifiers i where i.catalog_product_id=p.id),'[]'::jsonb),
 coalesce((select jsonb_agg(jsonb_build_object('type',l.learning_type,'key',l.learning_key,'value',l.learning_value,'confidence',l.confidence)) from public.quote_catalog_ai_learning l where l.active=true and (l.manufacturer is null or l.manufacturer=p.manufacturer)),'[]'::jsonb)
 from public.quote_catalog_ai_queue q join public.quote_catalog_products p on p.id=q.catalog_product_id
 where q.run_id=p_run_id and q.status='queued' and q.available_at<=now()
 order by q.priority desc,q.created_at limit greatest(1,least(coalesce(p_batch_size,10),50))
$$;

create or replace function public.ai_research_submit_candidate(
 p_run_id uuid,p_catalog_product_id uuid,p_source_id uuid,p_source_url text,p_discovered_title text,p_discovered_model_number text,p_identifier_type text,p_identifier_value text,p_price numeric,p_currency text,p_price_type text,p_condition text,p_availability_status text,p_match_confidence numeric,p_match_method text,p_evidence_category text,p_market_region text,p_source_country_code text,p_source_kind text,p_package_match text,p_variant_match text,p_evidence_notes text
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid; begin
 if not exists(select 1 from public.quote_catalog_ai_research_runs r where r.id=p_run_id) then raise exception 'Unknown research run'; end if;
 if p_match_confidence is null or p_match_confidence<0 or p_match_confidence>1 then raise exception 'Invalid match confidence'; end if;
 if p_variant_match not in ('exact','compatible','uncertain','mismatch') or p_package_match not in ('exact','compatible','uncertain','mismatch') then raise exception 'Invalid match status'; end if;
 if p_variant_match='mismatch' or p_package_match='mismatch' then raise exception 'Mismatched variants/packages cannot enter review queue'; end if;
 insert into public.quote_catalog_ai_candidates(run_id,catalog_product_id,source_id,source_url,discovered_title,discovered_model_number,discovered_identifier_type,discovered_identifier_value,price,currency,price_type,condition,availability_status,match_confidence,match_method,decision,evidence_category,market_region,source_country_code,source_kind,package_match,variant_match,evidence_notes,original_price,original_currency)
 values(p_run_id,p_catalog_product_id,p_source_id,p_source_url,p_discovered_title,p_discovered_model_number,p_identifier_type,p_identifier_value,p_price,p_currency,p_price_type,p_condition,p_availability_status,p_match_confidence,p_match_method,'pending',p_evidence_category,p_market_region,p_source_country_code,p_source_kind,p_package_match,p_variant_match,p_evidence_notes,p_price,p_currency)
 returning id into v_id;
 update public.quote_catalog_ai_research_runs set candidates_found=candidates_found+1,flagged_for_review=flagged_for_review+1 where id=p_run_id;
 return v_id;
end $$;

create or replace function public.ai_research_complete_queue_item(p_queue_id uuid,p_success boolean,p_error text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
 update public.quote_catalog_ai_queue
 set status=case when p_success then 'completed' else 'failed' end,
     attempts=attempts+1,
     completed_at=case when p_success then now() else completed_at end,
     last_error=p_error
 where id=p_queue_id;
end $$;