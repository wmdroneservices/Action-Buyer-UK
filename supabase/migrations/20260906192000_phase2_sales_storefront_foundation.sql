-- Phase 2 sales storefront foundation.
-- Additive only: preserves existing purchasing, inventory and multi-channel resale workflows.

alter table public.inventory_assets
  add column if not exists catalog_product_id uuid references public.quote_catalog_products(id) on delete set null;

create index if not exists inventory_assets_catalog_product_idx
  on public.inventory_assets(catalog_product_id);

create table if not exists public.sales_storefronts (
  id uuid primary key default gen_random_uuid(),
  store_key text not null unique,
  display_name text not null,
  active boolean not null default true,
  hide_empty_categories boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_catalog_visibility (
  id uuid primary key default gen_random_uuid(),
  storefront_id uuid not null references public.sales_storefronts(id) on delete cascade,
  scope_type text not null check (scope_type in ('manufacturer','category','product')),
  scope_key text not null,
  visibility_mode text not null default 'auto' check (visibility_mode in ('auto','show','hide')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storefront_id, scope_type, scope_key)
);

create table if not exists public.catalog_sales_content (
  catalog_product_id uuid primary key references public.quote_catalog_products(id) on delete cascade,
  hero_image_url text,
  manufacturer_image_url text,
  product_description text,
  source_attribution text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_sales_content (
  asset_id uuid primary key references public.inventory_assets(id) on delete cascade,
  condition_description text,
  hero_image_url text,
  listing_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_storefronts enable row level security;
alter table public.sales_catalog_visibility enable row level security;
alter table public.catalog_sales_content enable row level security;
alter table public.inventory_sales_content enable row level security;

drop policy if exists sales_storefronts_staff_all on public.sales_storefronts;
create policy sales_storefronts_staff_all on public.sales_storefronts
for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists sales_catalog_visibility_staff_all on public.sales_catalog_visibility;
create policy sales_catalog_visibility_staff_all on public.sales_catalog_visibility
for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists catalog_sales_content_staff_all on public.catalog_sales_content;
create policy catalog_sales_content_staff_all on public.catalog_sales_content
for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists inventory_sales_content_staff_all on public.inventory_sales_content;
create policy inventory_sales_content_staff_all on public.inventory_sales_content
for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

create or replace function public.staff_link_inventory_asset_catalog_product(
  p_asset_id uuid,
  p_catalog_product_id uuid
)
returns public.inventory_assets
language plpgsql
security definer
set search_path=public,auth
as $$
declare out_asset public.inventory_assets%rowtype;
begin
  if not exists(
    select 1 from public.staff_users s
    where s.user_id=auth.uid() and s.active=true
  ) then
    raise exception 'Active staff access required';
  end if;

  if not exists(select 1 from public.quote_catalog_products where id=p_catalog_product_id) then
    raise exception 'Catalogue product not found';
  end if;

  update public.inventory_assets
  set catalog_product_id=p_catalog_product_id,
      updated_at=now()
  where id=p_asset_id
  returning * into out_asset;

  if not found then
    raise exception 'Inventory asset not found';
  end if;

  return out_asset;
end;
$$;

revoke all on function public.staff_link_inventory_asset_catalog_product(uuid,uuid) from public,anon;
grant execute on function public.staff_link_inventory_asset_catalog_product(uuid,uuid) to authenticated;

create or replace function public.staff_sales_market_evidence(
  p_asset_id uuid
)
returns table(
  catalog_product_id uuid,
  category text,
  manufacturer text,
  model text,
  package_name text,
  retailer text,
  condition text,
  buy_price numeric,
  sell_price numeric,
  price_type text,
  availability_status text,
  source_url text,
  checked_at timestamptz,
  notes text,
  evidence_region text,
  price_currency text,
  reference_only boolean
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not exists(
    select 1 from public.staff_users s
    where s.user_id=auth.uid()
      and s.active=true
      and s.can_access_sales=true
  ) then
    raise exception 'Sales access required';
  end if;

  return query
  select
    p.id,
    p.category,
    p.manufacturer,
    p.model,
    p.package_name,
    rp.retailer,
    rp.condition,
    rp.buy_price,
    rp.sell_price,
    rp.price_type,
    rp.availability_status,
    rp.source_url,
    rp.checked_at,
    rp.notes,
    rp.evidence_region,
    rp.price_currency,
    rp.reference_only
  from public.inventory_assets a
  join public.quote_catalog_products p on p.id=a.catalog_product_id
  left join public.quote_catalog_retailer_prices rp on rp.catalog_product_id=p.id
  where a.id=p_asset_id
  order by rp.checked_at desc nulls last, rp.created_at desc nulls last;
end;
$$;

revoke all on function public.staff_sales_market_evidence(uuid) from public,anon;
grant execute on function public.staff_sales_market_evidence(uuid) to authenticated;

-- Neutral placeholder storefront; branding/domain can be added later without changing the core schema.
insert into public.sales_storefronts(store_key,display_name,active,hide_empty_categories)
values ('retail','Retail Storefront',true,true)
on conflict (store_key) do nothing;
