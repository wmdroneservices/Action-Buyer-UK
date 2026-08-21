-- Prevent duplicate quote items/offers during single-item submissions.
-- The valuation trigger may create the initial quote_item; the submission RPC
-- must reuse it rather than inserting a second copy.

create or replace function public.save_customer_valuation(p_record jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_candidate public.valuations%rowtype;
  v_valuation public.valuations%rowtype;
  v_item jsonb;
  v_position integer;
  v_count integer := 0;
  v_item_id uuid;
  v_auto_amount numeric;
  v_quote_basket jsonb := coalesce(p_record->'quoteBasket','[]'::jsonb);
  v_single_item boolean := jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 1;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) < 1 then
    raise exception 'At least one quote item is required';
  end if;

  select v.* into v_candidate
  from public.valuations v
  where v.user_id=v_user and v.archived_at is null and v.status in ('submitted','manual_review')
    and not exists (select 1 from public.quote_items qi join public.quote_offers qo on qo.item_id=qi.id where qi.valuation_id=v.id and qo.status not in ('draft','withdrawn','superseded'))
    and not exists (select 1 from public.quote_items qi join public.quote_item_refusals qir on qir.item_id=qi.id where qi.valuation_id=v.id)
  order by v.submitted_at desc limit 1 for update;

  if v_candidate.id is null then
    insert into public.valuations(user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,quote_data)
    values(v_user,coalesce(nullif(trim(p_record->>'quoteReference'),''),'WBA-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*900000)+100000)::text,6,'0')),'manual_review',nullif(trim(p_record->>'manufacturer'),''),nullif(trim(p_record->>'model'),''),nullif(trim(p_record->>'package'),''),nullif(trim(p_record->>'condition'),''),null,coalesce(p_record,'{}'::jsonb))
    returning * into v_valuation;
  else
    v_valuation:=v_candidate;
    v_quote_basket:=coalesce(v_candidate.quote_data->'quoteBasket','[]'::jsonb) || v_quote_basket;
    update public.valuations set quote_data=jsonb_set(jsonb_set(coalesce(v_candidate.quote_data,'{}'::jsonb),'{quoteBasket}',v_quote_basket,true),'{multiItemQuote}','true'::jsonb,true)||jsonb_build_object('quoteItemCount',jsonb_array_length(v_quote_basket),'lastSubmittedAt',now()),quote_amount=null,status='manual_review',updated_at=now() where id=v_candidate.id returning * into v_valuation;
  end if;

  if v_candidate.id is null and v_single_item then
    select id into v_item_id from public.quote_items where valuation_id=v_valuation.id order by item_position nulls last,created_at limit 1;
  else
    v_item_id:=null;
  end if;

  if v_item_id is not null then
    v_item:=p_items->0;
    v_auto_amount:=public.calculate_automatic_quote_amount(v_item);
    if v_auto_amount is not null then
      v_item:=jsonb_set(v_item,'{valuation}','"automatic"'::jsonb,true);
      v_item:=jsonb_set(v_item,'{amount}',to_jsonb(v_auto_amount),true);
    else
      v_item:=jsonb_set(v_item,'{valuation}','"manual"'::jsonb,true);
      v_item:=jsonb_set(v_item,'{amount}','null'::jsonb,true);
    end if;
    update public.quote_items set item_name=coalesce(nullif(trim(coalesce(v_item->>'itemName','')),''),nullif(trim(coalesce(v_item->>'modelName','')),''),'Equipment item'),manufacturer=nullif(trim(coalesce(v_item->>'manufacturer','')),''),model=nullif(trim(coalesce(v_item->>'model','')),''),package=nullif(trim(coalesce(v_item->>'package','')),''),item_status='under_assessment',item_position=1,item_data=v_item,updated_at=now() where id=v_item_id;
    v_count:=1;
    if v_auto_amount is not null and not exists(select 1 from public.quote_offers qo where qo.item_id=v_item_id and qo.offer_type='automatic' and qo.status not in ('withdrawn','superseded')) then
      insert into public.quote_offers(item_id,offer_type,amount,status,customer_message,published_at,created_by) values(v_item_id,'automatic',v_auto_amount,'draft','Your automatic valuation is ready for staff review.',null,null);
    end if;
  else
    select coalesce(max(item_position),0) into v_position from public.quote_items where valuation_id=v_valuation.id;
    for v_item in select value from jsonb_array_elements(p_items) loop
      v_position:=v_position+1;
      v_auto_amount:=public.calculate_automatic_quote_amount(v_item);
      if v_auto_amount is not null then
        v_item:=jsonb_set(v_item,'{valuation}','"automatic"'::jsonb,true);
        v_item:=jsonb_set(v_item,'{amount}',to_jsonb(v_auto_amount),true);
      else
        v_item:=jsonb_set(v_item,'{valuation}','"manual"'::jsonb,true);
        v_item:=jsonb_set(v_item,'{amount}','null'::jsonb,true);
      end if;
      insert into public.quote_items(valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data)
      values(v_valuation.id,coalesce(nullif(trim(coalesce(v_item->>'itemName','')),''),nullif(trim(coalesce(v_item->>'modelName','')),''),'Equipment item'),nullif(trim(coalesce(v_item->>'manufacturer','')),''),nullif(trim(coalesce(v_item->>'model','')),''),nullif(trim(coalesce(v_item->>'package','')),''),'under_assessment',v_position,v_item)
      returning id into v_item_id;
      if v_auto_amount is not null and not exists(select 1 from public.quote_offers qo where qo.item_id=v_item_id and qo.offer_type='automatic' and qo.status not in ('withdrawn','superseded')) then
        insert into public.quote_offers(item_id,offer_type,amount,status,customer_message,published_at,created_by) values(v_item_id,'automatic',v_auto_amount,'draft','Your automatic valuation is ready for staff review.',null,null);
      end if;
      v_count:=v_count+1;
    end loop;
  end if;

  return jsonb_build_object('valuation_id',v_valuation.id,'quote_reference',v_valuation.quote_reference,'merged_into_existing',v_candidate.id is not null,'added_item_count',v_count,'total_item_count',(select count(*) from public.quote_items where valuation_id=v_valuation.id));
end;
$function$;

create unique index if not exists quote_offers_active_automatic_unique_idx
on public.quote_offers(item_id)
where offer_type='automatic' and status not in ('withdrawn','superseded');
