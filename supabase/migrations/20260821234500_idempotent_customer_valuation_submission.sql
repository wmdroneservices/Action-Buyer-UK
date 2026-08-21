-- Make customer valuation submission idempotent and ensure each explicit submission
-- creates exactly one valuation. Multi-item quotes are still stored as one
-- valuation containing multiple quote_items. Duplicate browser requests use the
-- same submissionKey and return the already-created valuation.
create or replace function public.save_customer_valuation(p_record jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_valuation public.valuations%rowtype;
  v_existing public.valuations%rowtype;
  v_item jsonb;
  v_position integer := 0;
  v_count integer := 0;
  v_item_id uuid;
  v_auto_amount numeric;
  v_submission_key text := nullif(trim(p_record->>'submissionKey'),'');
  v_single_item boolean;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) < 1 then
    raise exception 'At least one quote item is required';
  end if;

  v_single_item := jsonb_array_length(p_items) = 1;

  if v_submission_key is not null then
    select v.* into v_existing
    from public.valuations v
    where v.user_id = v_user
      and v.archived_at is null
      and v.quote_data->>'submissionKey' = v_submission_key
    order by v.submitted_at desc
    limit 1
    for update;

    if v_existing.id is not null then
      return jsonb_build_object(
        'valuation_id', v_existing.id,
        'quote_reference', v_existing.quote_reference,
        'merged_into_existing', false,
        'duplicate_request', true,
        'added_item_count', 0,
        'total_item_count', (select count(*) from public.quote_items where valuation_id = v_existing.id)
      );
    end if;
  end if;

  insert into public.valuations(
    user_id, quote_reference, status, manufacturer, model, package,
    condition, quote_amount, quote_data
  )
  values(
    v_user,
    coalesce(nullif(trim(p_record->>'quoteReference'),''), 'WBA-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*900000)+100000)::text,6,'0')),
    'manual_review',
    nullif(trim(p_record->>'manufacturer'),''),
    nullif(trim(p_record->>'model'),''),
    nullif(trim(p_record->>'package'),''),
    nullif(trim(p_record->>'condition'),''),
    null,
    coalesce(p_record,'{}'::jsonb)
  )
  returning * into v_valuation;

  if v_single_item then
    select id into v_item_id
    from public.quote_items
    where valuation_id = v_valuation.id
    order by item_position nulls last, created_at
    limit 1;

    if v_item_id is null then
      raise exception 'The submitted quote item could not be created';
    end if;

    v_item := p_items->0;
    v_auto_amount := public.calculate_automatic_quote_amount(v_item);

    if v_auto_amount is not null then
      v_item := jsonb_set(v_item,'{valuation}','"automatic"'::jsonb,true);
      v_item := jsonb_set(v_item,'{amount}',to_jsonb(v_auto_amount),true);
    else
      v_item := jsonb_set(v_item,'{valuation}','"manual"'::jsonb,true);
      v_item := jsonb_set(v_item,'{amount}','null'::jsonb,true);
    end if;

    update public.quote_items
    set item_name = coalesce(nullif(trim(coalesce(v_item->>'itemName','')),''), nullif(trim(coalesce(v_item->>'modelName','')),''), 'Equipment item'),
        manufacturer = nullif(trim(coalesce(v_item->>'manufacturer','')),''),
        model = nullif(trim(coalesce(v_item->>'model','')),''),
        package = nullif(trim(coalesce(v_item->>'package','')),''),
        item_status = 'under_assessment',
        item_position = 1,
        item_data = v_item,
        updated_at = now()
    where id = v_item_id;

    v_count := 1;
  else
    for v_item in select value from jsonb_array_elements(p_items) loop
      v_position := v_position + 1;
      v_auto_amount := public.calculate_automatic_quote_amount(v_item);

      if v_auto_amount is not null then
        v_item := jsonb_set(v_item,'{valuation}','"automatic"'::jsonb,true);
        v_item := jsonb_set(v_item,'{amount}',to_jsonb(v_auto_amount),true);
      else
        v_item := jsonb_set(v_item,'{valuation}','"manual"'::jsonb,true);
        v_item := jsonb_set(v_item,'{amount}','null'::jsonb,true);
      end if;

      insert into public.quote_items(valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data)
      values(
        v_valuation.id,
        coalesce(nullif(trim(coalesce(v_item->>'itemName','')),''), nullif(trim(coalesce(v_item->>'modelName','')),''), 'Equipment item'),
        nullif(trim(coalesce(v_item->>'manufacturer','')),''),
        nullif(trim(coalesce(v_item->>'model','')),''),
        nullif(trim(coalesce(v_item->>'package','')),''),
        'under_assessment', v_position, v_item
      );

      v_count := v_count + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'valuation_id', v_valuation.id,
    'quote_reference', v_valuation.quote_reference,
    'merged_into_existing', false,
    'duplicate_request', false,
    'added_item_count', v_count,
    'total_item_count', (select count(*) from public.quote_items where valuation_id = v_valuation.id)
  );
end;
$function$;
