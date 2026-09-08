-- Unified Product Workbench: explicitly record which customer/staff photographs are approved for sale listings.
alter table public.inventory_sales_content
  add column if not exists listing_photo_paths jsonb not null default '[]'::jsonb;
