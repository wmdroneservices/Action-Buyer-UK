-- Fix RLS failure in staff candidate reassignment audit logging.
-- Keep authorization inside the RPC; SECURITY DEFINER allows the controlled audit insert.
create or replace function public.reassign_ai_candidate(
  p_candidate_id uuid,
  p_target_catalog_product_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c public.quote_catalog_ai_candidates%rowtype; v_from uuid;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid()) then
   raise exception 'Staff access required';
 end if;
 select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
 if not found then raise exception 'Candidate not found'; end if;
 if c.decision<>'pending' then raise exception 'Only pending candidates can be reassigned'; end if;
 if c.applied_at is not null then raise exception 'Applied candidates cannot be reassigned'; end if;
 if not exists(select 1 from public.quote_catalog_products p where p.id=p_target_catalog_product_id) then
   raise exception 'Target catalogue product not found';
 end if;
 if c.catalog_product_id=p_target_catalog_product_id then
   raise exception 'Candidate is already attached to that catalogue product';
 end if;
 v_from:=c.catalog_product_id;
 update public.quote_catalog_ai_candidates
 set original_catalog_product_id=coalesce(original_catalog_product_id,c.catalog_product_id),
     catalog_product_id=p_target_catalog_product_id,
     reassigned_at=now(), reassigned_by=auth.uid(),
     reassignment_reason=nullif(btrim(coalesce(p_reason,'')),''), reviewed_at=null, reviewed_by=null
 where id=p_candidate_id;
 insert into public.quote_catalog_ai_candidate_reassignments(candidate_id,from_catalog_product_id,to_catalog_product_id,reason,reassigned_by)
 values(p_candidate_id,v_from,p_target_catalog_product_id,nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
 return jsonb_build_object('candidate_id',p_candidate_id,'from_catalog_product_id',v_from,'to_catalog_product_id',p_target_catalog_product_id);
end
$function$;
