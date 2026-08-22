create table if not exists public.quote_catalog_retailer_prices (
  id uuid primary key default gen_random_uuid(),
  catalog_product_id uuid not null references public.quote_catalog_products(id) on delete cascade,
  retailer text not null,
  condition text not null,
  buy_price numeric,
  sell_price numeric,
  buy_method text,
  checked_at timestamptz not null default now(),
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_catalog_retailer_prices_retailer_condition_key unique (catalog_product_id, retailer, condition),
  constraint quote_catalog_retailer_prices_prices_nonnegative check ((buy_price is null or buy_price >= 0) and (sell_price is null or sell_price >= 0))
);

create index if not exists quote_catalog_retailer_prices_product_idx on public.quote_catalog_retailer_prices(catalog_product_id);
create index if not exists quote_catalog_retailer_prices_retailer_idx on public.quote_catalog_retailer_prices(retailer);

alter table public.quote_catalog_retailer_prices enable row level security;

create policy quote_catalog_retailer_prices_authenticated_select on public.quote_catalog_retailer_prices
  for select to authenticated using (true);

create policy quote_catalog_retailer_prices_staff_insert on public.quote_catalog_retailer_prices
  for insert to authenticated
  with check (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));

create policy quote_catalog_retailer_prices_staff_update on public.quote_catalog_retailer_prices
  for update to authenticated
  using (exists (select 1 from public.staff_users s where s.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));

create policy quote_catalog_retailer_prices_staff_delete on public.quote_catalog_retailer_prices
  for delete to authenticated
  using (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));
