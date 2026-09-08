-- Final Product Workbench: preserve an item-level editable manufacturer/product description.
alter table public.inventory_sales_content
  add column if not exists manufacturer_description text;
