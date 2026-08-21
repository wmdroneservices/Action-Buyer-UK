-- Automatic valuations must remain drafts until staff review.
-- Staff can then confirm the automatic amount or revise it on the quote review page.

create or replace function public.ensure_automatic_quote_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_amount numeric;
  v_valuation_type text;
begin
  if new.status <> 'valued' then
    return new;
  end if;

  for v_item in
    select qi.id, qi.item_data
    from public.quote_items qi
    where qi.valuation_id = new.id
    order by qi.item_position nulls last, qi.created_at
  loop
    v_valuation_type := lower(coalesce(v_item.item_data->>'valuation',''));

    if v_valuation_type = 'automatic' then
      v_amount := nullif(v_item.item_data->>'amount','')::numeric;

      if v_amount is not null and v_amount >= 0
         and not exists (
           select 1
           from public.quote_offers qo
           where qo.item_id = v_item.id
             and qo.offer_type = 'automatic'
             and qo.status not in ('withdrawn','superseded')
         ) then
        insert into public.quote_offers(
          item_id, offer_type, amount, status, customer_message,
          published_at, created_by
        )
        values(
          v_item.id,
          'automatic',
          v_amount,
          'draft',
          'Prepared automatically. Our team will review your submitted evidence before sending an offer.',
          null,
          null
        );
      end if;
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.ensure_automatic_quote_offer_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
begin
  if lower(coalesce(new.item_data->>'valuation','')) <> 'automatic' then
    return new;
  end if;

  v_amount := nullif(new.item_data->>'amount','')::numeric;

  if v_amount is null or v_amount < 0 then
    return new;
  end if;

  if not exists (
    select 1
    from public.quote_offers qo
    where qo.item_id = new.id
      and qo.offer_type = 'automatic'
      and qo.status not in ('withdrawn','superseded')
  ) then
    insert into public.quote_offers(
      item_id, offer_type, amount, status, customer_message,
      published_at, created_by
    )
    values(
      new.id,
      'automatic',
      v_amount,
      'draft',
      'Prepared automatically. Our team will review your submitted evidence before sending an offer.',
      null,
      null
    );
  end if;

  return new;
end;
$$;
