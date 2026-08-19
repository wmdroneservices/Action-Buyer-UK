create or replace function public.ensure_automatic_quote_offer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item_id uuid;
  v_offer public.quote_offers;
begin
  select id into v_item_id
  from public.quote_items
  where valuation_id = new.id;

  if v_item_id is null or new.quote_amount is null then
    return new;
  end if;

  -- Automatic offers are created only when the valuation itself is first
  -- valued. Final/manual/customer-response states must never recreate an
  -- automatic offer after a customer has moved on to another offer.
  if new.status = 'valued' then
    select * into v_offer
    from public.quote_offers
    where item_id = v_item_id
      and offer_type = 'automatic'
    order by created_at desc
    limit 1;

    if v_offer.id is null then
      insert into public.quote_offers(item_id,offer_type,amount,status,published_at,created_by)
      values(v_item_id,'automatic',new.quote_amount,'published',now(),new.user_id);
    elsif v_offer.status in ('draft','withdrawn','refused','superseded') then
      insert into public.quote_offers(item_id,offer_type,amount,status,published_at,created_by)
      values(v_item_id,'automatic',new.quote_amount,'published',now(),new.user_id);
    end if;
  end if;

  return new;
end;
$function$;
