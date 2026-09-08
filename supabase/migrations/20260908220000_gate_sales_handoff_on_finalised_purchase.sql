-- GearCashOut: prevent premature Sales handoff before the customer purchase is finalised.
-- Server-side gate. UI may hide the action, but this RPC is authoritative.

create or replace function public.staff_send_inventory_to_sales(p_asset_id uuid)
returns public.inventory_assets
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.inventory_assets%rowtype;
  i public.inventory_testing%rowtype;
  t public.inventory_testing%rowtype;
  v_source_sale public.sales%rowtype;
  has_completed_repair boolean := false;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then
    raise exception 'Staff access required';
  end if;

  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;

  if a.source_sale_id is not null then
    select * into v_source_sale from public.sales where id=a.source_sale_id for update;
    if not found then raise exception 'Linked customer purchase record not found'; end if;
    if v_source_sale.status <> 'completed' or v_source_sale.payment_status <> 'paid' then
      raise exception 'Customer purchase must be finalised and payment recorded before this item can be sent to Sales';
    end if;
  end if;

  if a.status <> 'Ready for Resale' then
    raise exception 'Asset must be Ready for Resale before it can be sent to Sales';
  end if;

  select * into i from public.inventory_testing
  where asset_id=p_asset_id and stage='inspection'
  order by created_at desc limit 1;
  if not found then raise exception 'Initial inspection must be completed before the item can be sent to Sales'; end if;

  if i.result <> 'Passed' then
    select exists(select 1 from public.inventory_repairs r where r.asset_id=p_asset_id) into has_completed_repair;
    if not (i.result in ('Requires Repair','Requires Attention','Failed') and has_completed_repair) then
      raise exception 'Initial inspection must pass, or a repair-required inspection must have a completed repair record';
    end if;
  end if;

  select * into t from public.inventory_testing
  where asset_id=p_asset_id and stage='testing'
  order by created_at desc limit 1;
  if not found or not (
    coalesce(t.flight_test,'') in ('Passed','Not Applicable')
    and coalesce(t.camera_test,'') in ('Passed','Not Applicable')
    and coalesce(t.battery_health,'') in ('Good','Not Applicable')
  ) then
    raise exception 'Technical testing must be completed and passed';
  end if;

  if a.customer_missing_items and not a.missing_items_resolved then
    raise exception 'Resolve customer-reported missing items before sending the item to Sales';
  end if;

  if nullif(trim(coalesce(a.condition_grade,'')),'') is null then
    raise exception 'Staff condition must be recorded during inspection';
  end if;

  update public.inventory_assets
  set status='Sent to Sales',
      previous_status=a.status,
      status_changed_at=now(),
      status_change_reason='Staff sent asset to Sales after purchase finalisation, inspection and testing',
      status_changed_by=auth.uid(),
      sent_to_sales_at=now(),
      sent_to_sales_by=auth.uid(),
      updated_at=now()
  where id=p_asset_id
  returning * into a;

  return a;
end;
$$;

revoke all on function public.staff_send_inventory_to_sales(uuid) from public;
grant execute on function public.staff_send_inventory_to_sales(uuid) to authenticated;
