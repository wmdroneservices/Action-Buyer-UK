alter table public.inventory_assets
  add column if not exists customer_package_name text,
  add column if not exists missing_items_resolved boolean not null default false,
  add column if not exists missing_items_resolution text;

create or replace function public.sync_inventory_customer_details()
returns trigger language plpgsql security definer set search_path=public as $$
declare q jsonb; c text; pkg text;
begin
  if new.source_quote_item_id is null then return new; end if;
  select item_data, package into q, pkg from public.quote_items where id=new.source_quote_item_id;
  if q is null then return new; end if;
  c:=nullif(trim(coalesce(q->>'condition','')), '');
  if c is null then c:=nullif(trim(coalesce(q->'singleItem'->>'condition','')), ''); end if;
  new.customer_condition:=coalesce(new.customer_condition,c);
  new.customer_package_name:=coalesce(new.customer_package_name,nullif(trim(pkg),''));
  new.customer_missing_items:=coalesce(new.customer_missing_items,coalesce((q->>'missingItems')::boolean,false));
  new.customer_missing_items_details:=coalesce(new.customer_missing_items_details,nullif(trim(coalesce(q->>'exceptionNotes','')),''));
  new.customer_damage:=coalesce(new.customer_damage,coalesce((q->>'damage')::boolean,false));
  new.customer_exception_notes:=coalesce(new.customer_exception_notes,nullif(trim(coalesce(q->>'exceptionNotes','')),''));
  return new;
end; $$;

drop trigger if exists inventory_assets_sync_customer_details on public.inventory_assets;
create trigger inventory_assets_sync_customer_details
before insert or update of source_quote_item_id on public.inventory_assets
for each row execute function public.sync_inventory_customer_details();

update public.inventory_assets ia
set customer_package_name=coalesce(ia.customer_package_name,nullif(trim(qi.package),'')),
    customer_condition=coalesce(ia.customer_condition,nullif(trim(coalesce(qi.item_data->>'condition','')), ''),nullif(trim(coalesce(qi.item_data->'singleItem'->>'condition','')), '')),
    customer_missing_items=coalesce(ia.customer_missing_items,coalesce((qi.item_data->>'missingItems')::boolean,false)),
    customer_missing_items_details=coalesce(ia.customer_missing_items_details,nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), '')),
    customer_damage=coalesce(ia.customer_damage,coalesce((qi.item_data->>'damage')::boolean,false)),
    customer_exception_notes=coalesce(ia.customer_exception_notes,nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), '')),
    updated_at=now()
from public.quote_items qi where qi.id=ia.source_quote_item_id;

create or replace function public.sync_inventory_asset_when_resale_listing_sold()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='Sold' and (tg_op='INSERT' or old.status is distinct from new.status) then
    new.sold_at:=coalesce(new.sold_at,now());
    update public.inventory_assets
    set previous_status=status,
        status='Sold',
        status_changed_at=now(),
        status_change_reason='Sold on sales channel: '||new.sales_channel,
        updated_at=now()
    where id=new.asset_id and status<>'Sold';
  end if;
  return new;
end; $$;

drop trigger if exists resale_listings_sync_asset_sold on public.resale_listings;
create trigger resale_listings_sync_asset_sold
before insert or update of status on public.resale_listings
for each row execute function public.sync_inventory_asset_when_resale_listing_sold();

revoke all on function public.sync_inventory_asset_when_resale_listing_sold() from public, anon;
grant execute on function public.sync_inventory_asset_when_resale_listing_sold() to authenticated;
