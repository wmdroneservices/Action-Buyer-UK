-- GearCashOut: move an inspection sale to PAYMENT DUE only after all
-- final-stage items in that sale have been accepted or refused.
-- A combined final quote may contain several sale items, so the first
-- accepted final offer must not advance the sale while another final item
-- is still awaiting the customer's response.

create or replace function public.accept_quote_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_item public.quote_items%rowtype;
  v_offer public.quote_offers%rowtype;
  v_user uuid:=auth.uid();
  v_submission_key text;
  v_sale public.sales%rowtype;
  v_sale_item public.sale_items%rowtype;
  v_total numeric(12,2);
  v_final_items_pending boolean:=false;
begin
  select qi.* into v_item
  from public.quote_items qi
  join public.valuations v on v.id=qi.valuation_id
  join public.quote_offers qo on qo.item_id=qi.id
  where qo.id=p_offer_id and v.user_id=v_user;
  if not found then
    raise exception 'Offer is not available for acceptance';
  end if;

  select qo.* into v_offer
  from public.quote_offers qo
  join public.quote_items qi on qi.id=qo.item_id
  join public.valuations v on v.id=qi.valuation_id
  where qo.id=p_offer_id and v.user_id=v_user
  for update;
  if not found or v_offer.status<>'published' then
    raise exception 'Offer is not available for acceptance';
  end if;

  select quote_data->>'submissionKey'
    into v_submission_key
  from public.valuations
  where id=v_item.valuation_id;

  if v_submission_key is not null and exists(
    select 1
    from public.quote_items qi2
    where qi2.valuation_id=v_item.valuation_id
      and qi2.item_status not in ('refused','closed','accepted')
      and not exists(
        select 1
        from public.quote_offers qo2
        where qo2.item_id=qi2.id
          and qo2.status='published'
      )
  ) then
    raise exception 'This combined valuation is not complete. Please wait until every item has a published offer.';
  end if;

  if v_offer.offer_type='automatic'
     and exists(
       select 1
       from public.quote_offers
       where item_id=v_offer.item_id
         and status='published'
         and offer_type in ('manual','final')
     ) then
    raise exception 'This automatic valuation has been replaced by a staff valuation.';
  end if;

  if v_submission_key is not null and not exists(
    select 1
    from public.valuations v2
    where v2.user_id=v_user
      and v2.quote_data->>'submissionKey'=v_submission_key
      and v2.status in ('customer_review','final_valuation')
  ) then
    raise exception 'This quote is not yet available for customer response';
  end if;

  update public.quote_offers
    set status='accepted',responded_at=now(),updated_at=now()
  where id=p_offer_id;

  update public.quote_items
    set item_status='accepted',updated_at=now()
  where id=v_offer.item_id;

  update public.quote_offers
    set status='superseded',updated_at=now()
  where item_id=v_offer.item_id
    and id<>p_offer_id
    and status='published';

  insert into public.offer_events(offer_id,event_type,actor_user_id)
  values(v_offer.id,'accepted',v_user);

  select s.* into v_sale
  from public.sales s
  join public.sale_items si on si.sale_id=s.id
  join public.quote_items qi2 on qi2.id=si.quote_item_id
  join public.valuations v2 on v2.id=qi2.valuation_id
  where s.user_id=v_user
    and s.status not in ('paid','completed','cancelled','closed','archived')
    and (
      qi2.valuation_id=v_item.valuation_id
      or (v_submission_key is not null and v2.quote_data->>'submissionKey'=v_submission_key)
    )
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    insert into public.sales(
      user_id,sale_reference,status,total_amount,accepted_at,payment_status
    )
    values(
      v_user,
      'GCO-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,6),
      case when v_offer.offer_type='final' then 'payment_due' else 'collecting_items' end,
      0,
      now(),
      case when v_offer.offer_type='final' then 'awaiting_bank_details' else 'awaiting_final_quote' end
    )
    returning * into v_sale;
  end if;

  insert into public.sale_items(sale_id,quote_item_id,accepted_offer_id,amount)
  values(v_sale.id,v_offer.item_id,v_offer.id,v_offer.amount)
  on conflict(sale_id,quote_item_id)
  do update set accepted_offer_id=excluded.accepted_offer_id,amount=excluded.amount
  returning * into v_sale_item;

  if not exists(
    select 1 from public.shipments
    where sale_id=v_sale.id and shipment_type='inbound'
  ) then
    insert into public.shipments(sale_id,user_id,shipment_type,status)
    values(v_sale.id,v_user,'inbound','awaiting_label');
  end if;

  select coalesce(sum(amount),0)
    into v_total
  from public.sale_items
  where sale_id=v_sale.id;

  if v_offer.offer_type='final' then
    select exists(
      select 1
      from public.sale_items si2
      join public.quote_items qi3 on qi3.id=si2.quote_item_id
      where si2.sale_id=v_sale.id
        and qi3.item_status not in ('accepted','refused','closed')
    ) into v_final_items_pending;

    if not v_final_items_pending then
      update public.sales
      set accepted_at=coalesce(accepted_at,now()),
          status='payment_due',
          payment_status='awaiting_bank_details',
          total_amount=v_total,
          updated_at=now()
      where id=v_sale.id;
    else
      update public.sales
      set total_amount=v_total,
          updated_at=now()
      where id=v_sale.id;
    end if;
  else
    update public.sales
    set total_amount=v_total,
        updated_at=now()
    where id=v_sale.id;
  end if;

  return jsonb_build_object(
    'sale_id',v_sale.id,
    'sale_reference',v_sale.sale_reference,
    'total_amount',(select total_amount from public.sales where id=v_sale.id),
    'sale_item_id',v_sale_item.id,
    'payment_status',(select payment_status from public.sales where id=v_sale.id),
    'status',(select status from public.sales where id=v_sale.id)
  );
end;
$function$;
