-- Pre-purchase returns for customer-owned items following a refused valuation.
create table if not exists public.purchase_return_cases (
  id uuid primary key default gen_random_uuid(),
  quote_item_id uuid not null unique references public.quote_items(id) on delete cascade,
  valuation_id uuid not null references public.valuations(id) on delete cascade,
  status text not null default 'return_required' check (status in ('return_required','return_arranged','dispatched','delivered','closed')),
  carrier text,
  tracking_number text,
  return_label_url text,
  notes text,
  arranged_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchase_return_cases_status_idx on public.purchase_return_cases(status);
create index if not exists purchase_return_cases_valuation_idx on public.purchase_return_cases(valuation_id);
alter table public.purchase_return_cases enable row level security;
drop policy if exists purchase_return_cases_staff_all on public.purchase_return_cases;
create policy purchase_return_cases_staff_all on public.purchase_return_cases for all to authenticated using (exists(select 1 from public.staff_users s where s.user_id=auth.uid())) with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));
create or replace function public.set_purchase_return_case_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists purchase_return_cases_updated_at on public.purchase_return_cases;
create trigger purchase_return_cases_updated_at before update on public.purchase_return_cases for each row execute function public.set_purchase_return_case_updated_at();
