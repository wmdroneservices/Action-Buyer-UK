alter table public.resale_listings
  add column if not exists listing_title text,
  add column if not exists listing_description text,
  add column if not exists listing_data jsonb not null default '{}'::jsonb;

create unique index if not exists resale_listings_asset_channel_uidx
  on public.resale_listings(asset_id, sales_channel);

create or replace function public.handle_resale_listing_sold()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status = 'Sold' and (old.status is distinct from new.status) then
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
after update of status on public.resale_listings
for each row execute function public.handle_resale_listing_sold();

drop trigger if exists resale_listing_sold_warning_insert on public.resale_listings;
create trigger resale_listing_sold_warning_insert
after insert on public.resale_listings
for each row execute function public.handle_resale_listing_sold();
