create table if not exists public.inventory_testing (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.inventory_assets(id) on delete cascade,
  stage text not null default 'testing' check (stage in ('inspection','testing')),
  result text,
  visual_condition text,
  missing_items boolean,
  damage_notes text,
  serial_verified boolean,
  accessories_verified boolean,
  flight_test text,
  camera_test text,
  battery_health text,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_testing_asset_created_idx on public.inventory_testing(asset_id, created_at desc);

alter table public.inventory_testing enable row level security;

drop policy if exists "Staff can read testing history" on public.inventory_testing;
drop policy if exists "Staff can create testing history" on public.inventory_testing;
drop policy if exists "Staff can update testing history" on public.inventory_testing;

create policy "Staff can read testing history" on public.inventory_testing for select using (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));
create policy "Staff can create testing history" on public.inventory_testing for insert with check (exists (select 1 from public.staff_users s where s.user_id = auth.uid()) and created_by = auth.uid());
create policy "Staff can update testing history" on public.inventory_testing for update using (exists (select 1 from public.staff_users s where s.user_id = auth.uid())) with check (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));

alter table public.inventory_preparation enable row level security;
drop policy if exists "Staff can update preparation records" on public.inventory_preparation;
create policy "Staff can update preparation records" on public.inventory_preparation for update using (exists (select 1 from public.staff_users s where s.user_id = auth.uid())) with check (exists (select 1 from public.staff_users s where s.user_id = auth.uid()));

drop trigger if exists inventory_testing_set_updated_at on public.inventory_testing;
create or replace function public.set_inventory_testing_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); new.updated_by=auth.uid(); return new; end; $$;
create trigger inventory_testing_set_updated_at before update on public.inventory_testing for each row execute function public.set_inventory_testing_updated_at();
