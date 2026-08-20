create or replace function public.staff_refuse_quote_item(
  p_item_id uuid,
  p_internal_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_item public.quote_items%rowtype;
  v_latest_offer public.quote_offers%rowtype;
  v_offer_id uuid;
  v_message text := 'Thank you for submitting your item to GearCashOut. Unfortunately, we are unable to make an offer for this item on this occasion. We appreciate you taking the time to send us the details and photographs, and we are sorry we could not help on this occasion.';
begin
  if not exists (select 1 from public.staff_users where user_id = v_user) then
    raise exception 'Staff access required';
  end if;

  select qi.* into v_item
  from public.quote_items qi
  where qi.id = p_item_id
  for update;

  if not found then
    raise exception 'Quote item not found';
  end if;

  if v_item.item_status in ('accepted', 'closed') then
    raise exception 'This item has already been accepted or closed and cannot be refused';
  end if;

  if v_item.item_status = 'refused' then
    raise exception 'This item has already been refused';
  end if;

  select qo.* into v_latest_offer
  from public.quote_offers qo
  where qo.item_id = p_item_id
    and qo.status = 'published'
  order by qo.created_at desc
  limit 1
  for update;

  if found then
    update public.quote_offers
    set status = 'withdrawn', updated_at = now()
    where item_id = p_item_id
      and status = 'published'
      and id <> v_latest_offer.id;

    update public.quote_offers
    set status = 'refused',
        responded_at = now(),
        customer_message = v_message,
        internal_notes = null,
        updated_at = now()
    where id = v_latest_offer.id
    returning id into v_offer_id;
  else
    insert into public.quote_offers
      (item_id, offer_type, amount, status, internal_notes, customer_message, published_at, responded_at, created_by)
    values
      (p_item_id, 'manual', 0, 'refused', null, v_message, null, now(), v_user)
    returning id into v_offer_id;
  end if;

  update public.quote_items
  set item_status = 'refused', updated_at = now()
  where id = p_item_id;

  insert into public.quote_item_refusals(item_id, offer_id, reason, refused_by)
  values (p_item_id, v_offer_id, nullif(trim(p_internal_reason), ''), v_user);

  insert into public.offer_events(offer_id, event_type, actor_user_id)
  values (v_offer_id, 'refused', v_user);

  return jsonb_build_object(
    'offer_id', v_offer_id,
    'item_id', p_item_id,
    'status', 'refused',
    'item_status', 'refused'
  );
end;
$function$;

revoke all on function public.staff_refuse_quote_item(uuid, text) from public;
grant execute on function public.staff_refuse_quote_item(uuid, text) to authenticated;
