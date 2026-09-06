-- GearCashOut: allow Repair as an authoritative inventory expense category.
-- Fixes staff_complete_inventory_repair(...) failing when a non-zero repair cost is recorded.

alter table public.inventory_expenses
  drop constraint if exists inventory_expenses_category_check;

alter table public.inventory_expenses
  add constraint inventory_expenses_category_check
  check (category = any (array[
    'Collection','Postage','Accessories','Replacement Parts',
    'Repair','Cleaning','Testing','Preparation','Other'
  ]));
