-- Unified Product Workbench master listing fields.
-- The physical asset remains the inventory truth; these fields hold the shared
-- listing presentation defaults used by WEBSITE and external marketplace records.

alter table public.inventory_sales_content
  add column if not exists listing_title text,
  add column if not exists asking_price numeric,
  add column if not exists postage_packing numeric;
