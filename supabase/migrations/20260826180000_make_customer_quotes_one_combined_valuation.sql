-- A customer submission is one valuation, even when it contains multiple items.
-- quote_items remain separate so each item can have its own automatic/manual/final offer,
-- but the customer-facing quote, email and later sale can treat the submission as one unit.

create or replace function public.create_customer_quotes(p_record jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_valuation_id uuid;
  v_quote_reference text;
  v_count integer := 0;
  v_position integer := 0;
  v_submission_key text := nullif(trim(coalesce(p_record->>'submissionKey','')), '');
  v_existing public.valuations%rowtype;
  v_record jsonb := coalesce(p_record,'{}'::jsonb);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) < 1 then
    raise exception 'At least one quote item is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));

  if v_submission_key is not null then
    select v.* into v_existing
    from public.valuations v
    where v.user_id=v_user
      and v.archived_at is null
      and v.quote_data->>'submissionKey'=v_submission_key
    order by v.submitted_at desc
    limit 1
    for update;
    if v_existing.id is not null then
      return jsonb_build_object(
        'valuation_id',v_existing.id,
        'quote_reference',v_existing.quote_reference,
        'created_count',0,
        'duplicate_request',true,
        'item_count',(select count(*) from public.quote_items where valuation_id=v_existing.id)
      );
    end if;
  end if;

  v_record := jsonb_set(v_record,'{multiItemQuote}',to_jsonb(jsonb_array_length(p_items)>1),true);
  v_record := jsonb_set(v_record,'{quoteItemCount}',to_jsonb(jsonb_array_length(p_items)),true);

  v_quote_reference := coalesce(nullif(trim(v_record->>'quoteReference'),''), 'WBA-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*900000)+100000)::text,6,'0'));

  insert into public.valuations(
    user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,quote_data
  ) values (
    v_user,
    v_quote_reference,
    'submitted',
    case when jsonb_array_length(p_items)=1 then nullif(trim(p_items->0->>'manufacturer'),'') else null end,
    case when jsonb_array_length(p_items)=1 then nullif(trim(p_items->0->>'model'),'') else null end,
    case when jsonb_array_length(p_items)=1 then nullif(trim(coalesce(p_items->0->>'packageName',p_items->0->>'package',''))) else null end,
    case when jsonb_array_length(p_items)=1 then nullif(trim(p_items->0->>'condition'),'') else null end,
    null,
    v_record
  ) returning id into v_valuation_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.quote_items(
      valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data
    ) values (
      v_valuation_id,
      coalesce(nullif(trim(v_item->>'itemName'),''),nullif(trim(v_item->>'model'),''),'Equipment item'),
      nullif(trim(v_item->>'manufacturer'),''),
      nullif(trim(v_item->>'model'),''),
      nullif(trim(coalesce(v_item->>'packageName',v_item->>'package','')),''),
      'under_assessment',
      v_position,
      v_item
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'valuation_id',v_valuation_id,
    'quote_reference',v_quote_reference,
    'created_count',1,
    'item_count',v_count,
    'duplicate_request',false
  );
end;
$function$;
