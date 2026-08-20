create or replace function public.save_customer_valuation(p_record jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_candidate public.valuations%rowtype;
  v_valuation public.valuations%rowtype;
  v_item jsonb;
  v_position integer;
  v_count integer := 0;
  v_quote_basket jsonb := coalesce(p_record->'quoteBasket','[]'::jsonb);
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) < 1 then
    raise exception 'At least one quote item is required';
  end if;

  -- Later submissions join the customer's most recent still-unactioned valuation.
  -- Once staff creates an offer or records a refusal, the valuation is closed to new batching.
  select v.*
    into v_candidate
  from public.valuations v
  where v.user_id = v_user
    and v.archived_at is null
    and v.status in ('submitted','manual_review')
    and not exists (
      select 1
      from public.quote_items qi
      join public.quote_offers qo on qo.item_id = qi.id
      where qi.valuation_id = v.id
        and qo.status not in ('withdrawn','superseded')
    )
    and not exists (
      select 1
      from public.quote_items qi
      join public.quote_item_refusals qir on qir.item_id = qi.id
      where qi.valuation_id = v.id
    )
  order by v.submitted_at desc
  limit 1
  for update;

  if v_candidate.id is null then
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
  else
    v_valuation := v_candidate;
    v_quote_basket := coalesce(v_candidate.quote_data->'quoteBasket','[]'::jsonb) || v_quote_basket;

    update public.valuations
    set quote_data = jsonb_set(
          jsonb_set(
            coalesce(v_candidate.quote_data,'{}'::jsonb),
            '{quoteBasket}',
            v_quote_basket,
            true
          ),
          '{multiItemQuote}',
          'true'::jsonb,
          true
        ) || jsonb_build_object(
          'quoteItemCount', jsonb_array_length(v_quote_basket),
          'lastSubmittedAt', now()
        ),
        quote_amount = null,
        status = 'manual_review',
        updated_at = now()
    where id = v_candidate.id
    returning * into v_valuation;
  end if;

  select coalesce(max(item_position),0) into v_position
  from public.quote_items
  where valuation_id = v_valuation.id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.quote_items(
      valuation_id, item_name, manufacturer, model, package,
      item_status, item_position, item_data
    )
    values(
      v_valuation.id,
      coalesce(nullif(trim(coalesce(v_item->>'itemName','')),''), nullif(trim(coalesce(v_item->>'modelName','')),''), 'Equipment item'),
      nullif(trim(coalesce(v_item->>'manufacturer','')),''),
      nullif(trim(coalesce(v_item->>'model','')),''),
      nullif(trim(coalesce(v_item->>'package','')),''),
      'under_assessment',
      v_position,
      v_item
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'valuation_id', v_valuation.id,
    'quote_reference', v_valuation.quote_reference,
    'merged_into_existing', v_candidate.id is not null,
    'added_item_count', v_count,
    'total_item_count', (select count(*) from public.quote_items where valuation_id = v_valuation.id)
  );
end;
$$;

revoke all on function public.save_customer_valuation(jsonb,jsonb) from public;
grant execute on function public.save_customer_valuation(jsonb,jsonb) to authenticated;
