alter table public.resale_listings
  add column if not exists listing_url text;
