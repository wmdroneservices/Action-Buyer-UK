-- Phase 2: central Outlet → Listing → SKU architecture.
-- Extends existing resale_listings without replacing existing sold/delist behaviour.

create table if not exists public.sales_outlets (
 id uuid primary key default gen_random_uuid(),
 outlet_code text not null unique,
 outlet_name text not null,
 outlet_type text not null check (outlet_type in ('owned_storefront','marketplace','auction','other')),
 active boolean not null default true,
 public_base_url text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.resale_listings add column if not exists outlet_id uuid references public.sales_outlets(id) on delete restrict;

insert into public.sales_outlets(outlet_code,outlet_name,outlet_type,active) values
 ('EBAY','eBay','marketplace',true),('FACEBOOK_MARKETPLACE','Facebook Marketplace','marketplace',true),
 ('VINTED','Vinted','marketplace',true),('AMAZON','Amazon','marketplace',true),
 ('GUMTREE','Gumtree','marketplace',true),('WEBSITE','GearCashOut Retail Website','owned_storefront',true),
 ('MARKETPLACE','Marketplace','marketplace',true),('CENTRAL','Central','other',true),('OTHER','Other','other',true)
on conflict (outlet_code) do nothing;

update public.resale_listings rl set outlet_id=o.id
from public.sales_outlets o
where rl.outlet_id is null
and upper(replace(replace(trim(rl.sales_channel),' ','_'),'-','_'))=o.outlet_code;

create or replace function public.set_resale_listing_outlet()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.outlet_id is null then
   select id into new.outlet_id from public.sales_outlets
   where upper(replace(replace(trim(new.sales_channel),' ','_'),'-','_'))=outlet_code limit 1;
 end if;
 return new;
end; $$;

drop trigger if exists trg_set_resale_listing_outlet on public.resale_listings;
create trigger trg_set_resale_listing_outlet before insert or update of sales_channel,outlet_id
on public.resale_listings for each row execute function public.set_resale_listing_outlet();

-- Remove duplicate sold-warning trigger; retain the canonical status-change trigger.
drop trigger if exists resale_listing_sold_warning_insert on public.resale_listings;

alter table public.sales_outlets enable row level security;
drop policy if exists sales_outlets_staff_read on public.sales_outlets;
create policy sales_outlets_staff_read on public.sales_outlets for select to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists sales_outlets_management_write on public.sales_outlets;
create policy sales_outlets_management_write on public.sales_outlets for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and coalesce(s.can_manage_staff,false)=true))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and coalesce(s.can_manage_staff,false)=true));