create or replace function public.handle_resale_listing_sold()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status = 'Sold' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update public.resale_listings
       set status = 'Delist Required', updated_at = now()
     where asset_id = new.asset_id
       and id <> new.id
       and status in ('Draft','Ready For Listing','Published','Reserved');
  end if;
  return new;
end;
$$;

drop trigger if exists resale_listing_sold_warning on public.resale_listings;
create trigger resale_listing_sold_warning
after insert or update of status on public.resale_listings
for each row execute function public.handle_resale_listing_sold();
