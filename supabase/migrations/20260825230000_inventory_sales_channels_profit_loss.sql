create unique index if not exists resale_listings_asset_channel_uidx on public.resale_listings(asset_id, sales_channel);

alter table public.resale_listings add column if not exists sold_price numeric;
alter table public.resale_listings add column if not exists selling_fees numeric default 0;
alter table public.resale_listings add column if not exists shipping_cost numeric default 0;

create or replace function public.sync_inventory_customer_details()
returns trigger language plpgsql security definer set search_path=public as $$
declare q jsonb; c text; missing boolean; damage boolean; details text;
begin
  if new.source_quote_item_id is null then return new; end if;
  select item_data into q from public.quote_items where id=new.source_quote_item_id;
  if q is null then return new; end if;
  c:=nullif(trim(coalesce(q->>'condition','')), '');
  if c is null then c:=nullif(trim(coalesce(q->'singleItem'->>'condition','')), ''); end if;
  missing:=coalesce((q->>'missingItems')::boolean,false);
  damage:=coalesce((q->>'damage')::boolean,false);
  details:=nullif(trim(coalesce(q->>'missingItemsDetails','')),'');
  if details is null then details:=nullif(trim(coalesce(q->>'exceptionNotes','')),''); end if;
  new.customer_condition:=coalesce(new.customer_condition,c);
  new.customer_missing_items:=coalesce(new.customer_missing_items,missing);
  new.customer_missing_items_details:=coalesce(new.customer_missing_items_details,details);
  new.customer_damage:=coalesce(new.customer_damage,damage);
  new.customer_exception_notes:=coalesce(new.customer_exception_notes,nullif(trim(coalesce(q->>'exceptionNotes','')),''));
  return new;
end; $$;

drop trigger if exists inventory_assets_sync_customer_details on public.inventory_assets;
create trigger inventory_assets_sync_customer_details
before insert or update of source_quote_item_id on public.inventory_assets
for each row execute function public.sync_inventory_customer_details();

update public.inventory_assets ia
set customer_condition=coalesce(ia.customer_condition,nullif(trim(coalesce(qi.item_data->>'condition','')), ''),nullif(trim(coalesce(qi.item_data->'singleItem'->>'condition','')), '')),
    customer_missing_items=coalesce(ia.customer_missing_items,coalesce((qi.item_data->>'missingItems')::boolean,false)),
    customer_missing_items_details=coalesce(ia.customer_missing_items_details,nullif(trim(coalesce(qi.item_data->>'missingItemsDetails','')), ''),nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), '')),
    customer_damage=coalesce(ia.customer_damage,coalesce((qi.item_data->>'damage')::boolean,false)),
    customer_exception_notes=coalesce(ia.customer_exception_notes,nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), ''),null),
    updated_at=now()
from public.quote_items qi where qi.id=ia.source_quote_item_id;
