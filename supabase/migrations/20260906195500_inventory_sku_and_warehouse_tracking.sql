-- Phase 2 inventory SKU and warehouse tracking.
alter table public.inventory_assets add column if not exists sku text;
create unique index if not exists inventory_assets_sku_unique_idx on public.inventory_assets(sku) where sku is not null;

create sequence if not exists public.inventory_sku_sequence start 100001;

create or replace function public.next_inventory_sku()
returns text language plpgsql security definer set search_path=public as $$
declare v_n bigint;
begin
  v_n:=nextval('public.inventory_sku_sequence');
  return 'GCO-'||to_char(current_date,'YYYY')||'-'||lpad(v_n::text,6,'0');
end; $$;

alter table public.inventory_assets alter column sku set default public.next_inventory_sku();

update public.inventory_assets
set sku=public.next_inventory_sku()
where sku is null;

alter table public.inventory_assets alter column sku set not null;

create table if not exists public.inventory_locations (
 id uuid primary key default gen_random_uuid(),
 location_code text not null unique,
 location_name text not null,
 location_type text not null default 'warehouse',
 active boolean not null default true,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.inventory_location_movements (
 id uuid primary key default gen_random_uuid(),
 asset_id uuid not null references public.inventory_assets(id) on delete cascade,
 from_location_id uuid references public.inventory_locations(id) on delete set null,
 to_location_id uuid references public.inventory_locations(id) on delete set null,
 movement_type text not null,
 notes text,
 moved_at timestamptz not null default now(),
 moved_by uuid references auth.users(id) on delete set null
);

alter table public.inventory_locations enable row level security;
alter table public.inventory_location_movements enable row level security;

drop policy if exists inventory_locations_staff_all on public.inventory_locations;
create policy inventory_locations_staff_all on public.inventory_locations for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists inventory_location_movements_staff_all on public.inventory_location_movements;
create policy inventory_location_movements_staff_all on public.inventory_location_movements for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

create or replace function public.staff_move_inventory_asset(
 p_asset_id uuid,
 p_to_location_id uuid,
 p_movement_type text default 'move',
 p_notes text default null
) returns public.inventory_assets
language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; v_from uuid;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true) then raise exception 'Active staff access required'; end if;
 select * into a from public.inventory_assets where id=p_asset_id for update;
 if not found then raise exception 'Inventory asset not found'; end if;
 if not exists(select 1 from public.inventory_locations where id=p_to_location_id and active=true) then raise exception 'Destination location not found or inactive'; end if;
 select id into v_from from public.inventory_locations where location_name=a.current_location or location_code=a.current_location limit 1;
 update public.inventory_assets
 set current_location=(select location_code from public.inventory_locations where id=p_to_location_id),
     updated_at=now()
 where id=p_asset_id returning * into a;
 insert into public.inventory_location_movements(asset_id,from_location_id,to_location_id,movement_type,notes,moved_by)
 values(p_asset_id,v_from,p_to_location_id,coalesce(nullif(trim(p_movement_type),''),'move'),p_notes,auth.uid());
 return a;
end; $$;

-- Secondary paid-sale creation route: use default SKU and exact catalogue resolver.
create or replace function public.staff_create_inventory_from_paid_sale(p_sale_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_staff uuid:=auth.uid(); v_sale public.sales%rowtype; v_item public.sale_items%rowtype; v_quote public.quote_items%rowtype; v_asset public.inventory_assets%rowtype; v_created integer:=0; v_assets jsonb:='[]'::jsonb; v_catalog uuid;
begin
 if v_staff is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.staff_users where user_id=v_staff) then raise exception 'Staff access required'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.payment_status<>'paid' and v_sale.status<>'paid' then raise exception 'Inventory can only be created after the seller payment is marked paid'; end if;
 for v_item in select * from public.sale_items where sale_id=p_sale_id order by created_at,id loop
  if exists(select 1 from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id) then continue; end if;
  select * into v_quote from public.quote_items where id=v_item.quote_item_id;
  if not found then raise exception 'Quote item % not found',v_item.quote_item_id; end if;
  v_catalog:=public.resolve_quote_item_catalog_product(v_item.quote_item_id);
  insert into public.inventory_assets(asset_reference,source_sale_id,source_quote_item_id,catalog_product_id,manufacturer,model,package_name,status,purchase_price,acquired_at,current_location,notes)
  values('GCO-INV-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),p_sale_id,v_item.quote_item_id,v_catalog,v_quote.manufacturer,v_quote.model,v_quote.package,'Awaiting Receipt',v_item.amount,now(),'Received Area','Created automatically from paid seller purchase '||coalesce(v_sale.sale_reference,''))
  returning * into v_asset;
  v_created:=v_created+1;
  v_assets:=v_assets||jsonb_build_array(jsonb_build_object('asset_id',v_asset.id,'sku',v_asset.sku,'asset_reference',v_asset.asset_reference,'catalog_product_id',v_asset.catalog_product_id,'status',v_asset.status));
 end loop;
 return jsonb_build_object('sale_id',p_sale_id,'created_count',v_created,'assets',v_assets);
end; $$;

revoke all on function public.next_inventory_sku() from public,anon;
revoke all on function public.staff_move_inventory_asset(uuid,uuid,text,text) from public,anon;
grant execute on function public.staff_move_inventory_asset(uuid,uuid,text,text) to authenticated;