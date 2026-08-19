-- The valuations.status check constraint does not permit 'final_offer'.
-- Keep the parent valuation in the existing 'final_valuation' state while
-- quote_offers/quote_items carry the customer-facing final-offer state.
create or replace function public.publish_quote_offer(
  p_item_id uuid,
  p_offer_type text,
  p_amount numeric,
  p_internal_notes text default null,
  p_customer_message text default null
)
returns public.quote_offers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offer public.quote_offers;
  v_user uuid := auth.uid();
  v_customer uuid;
  v_valuation_id uuid;
begin
  if not exists (select 1 from public.staff_users where user_id = v_user) then
    raise exception 'Staff access required';
  end if;

  if p_offer_type not in ('automatic', 'manual', 'final') then
    raise exception 'Invalid offer type';
  end if;

  if p_amount < 0 then
    raise exception 'Amount cannot be negative';
  end if;

  select v.user_id, v.id
    into v_customer, v_valuation_id
  from public.quote_items qi
  join public.valuations v on v.id = qi.valuation_id
  where qi.id = p_item_id;

  if v_customer is null then
    raise exception 'Quote item not found';
  end if;

  if p_offer_type = 'final' then
    update public.quote_offers
    set status = 'withdrawn', updated_at = now()
    where item_id = p_item_id
      and status = 'published';
  end if;

  insert into public.quote_offers(
    item_id, offer_type, amount, status, internal_notes,
    customer_message, published_at, created_by
  )
  values(
    p_item_id, p_offer_type, p_amount, 'published', p_internal_notes,
    p_customer_message, now(), v_user
  )
  returning * into v_offer;

  update public.quote_items
  set item_status = case
      when p_offer_type = 'final' then 'final_offer'
      else item_status
    end,
    updated_at = now()
  where id = p_item_id;

  if p_offer_type = 'final' then
    update public.valuations
    set status = 'final_valuation',
        quote_amount = p_amount,
        updated_at = now()
    where id = v_valuation_id;
  end if;

  insert into public.offer_events(
    offer_id, event_type, new_amount, note, actor_user_id
  )
  values(
    v_offer.id, 'published', p_amount, p_internal_notes, v_user
  );

  return v_offer;
end;
$function$;
