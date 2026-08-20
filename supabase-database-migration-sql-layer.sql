-- Action Buyer UK Supabase Database Migration Layer
-- Initial schema foundation for quotes, valuations, offers and verification workflow

create table if not exists profiles (
  id uuid primary key,
  role text default 'customer',
  created_at timestamp with time zone default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  status text default 'new',
  created_at timestamp with time zone default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  category text,
  manufacturer text,
  model text,
  condition text,
  created_at timestamp with time zone default now()
);

create table if not exists valuations (
  id uuid primary key default gen_random_uuid(),
  quote_item_id uuid references quote_items(id) on delete cascade,
  source text,
  market_price numeric,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  quote_item_id uuid references quote_items(id) on delete cascade,
  suggested_amount numeric,
  final_amount numeric,
  status text default 'suggested',
  created_at timestamp with time zone default now()
);

create table if not exists audit_history (
  id uuid primary key default gen_random_uuid(),
  record_type text,
  record_id uuid,
  action text,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- RLS enabled as preparation for production policies
alter table profiles enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table valuations enable row level security;
alter table offers enable row level security;
alter table audit_history enable row level security;
