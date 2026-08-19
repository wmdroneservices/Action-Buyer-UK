create or replace function public.refuse_quote_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offer public.quote_offers%rowtype;
  v_user uuid := auth.uid();
  v_item_status text;
begin
  select qo.* into v_offer
  from public.quote_offers qo
  join public.quote_items qi on qi.id=qo.item_id
  join public.valuations v on v.id=qi.valuation_id
  where qo.id=p_offer_id and v.user_id=v_user
  for update;

  if not found or v_offer.status<>'published' then
    raise exception 'Offer is not available for refusal';
  end if;

  update public.quote_offers
  set status='refused',responded_at=now(),updated_at=now()
  where id=p_offer_id;

  if exists (
    select 1 from public.quote_offers
    where item_id=v_offer.item_id and status='accepted'
  ) then
    v_item_status := 'accepted';
  elsif exists (
    select 1 from public.quote_offers
    where item_id=v_offer.item_id and status='published'
  ) then
    v_item_status := 'under_assessment';
  else
    v_item_status := 'refused';
  end if;

  update public.quote_items
  set item_status=v_item_status,updated_at=now()
  where id=v_offer.item_id;

  insert into public.offer_events(offer_id,event_type,actor_user_id)
  values(p_offer_id,'refused',v_user);

  return jsonb_build_object('offer_id',p_offer_id,'status','refused','item_status',v_item_status);
end;
$function$;
