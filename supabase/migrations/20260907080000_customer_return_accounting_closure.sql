-- Customer-return cost, assessment, disposal and financial closure.
-- Buyer returns remain separate from purchase_return_cases.

alter table public.sales_customer_returns
  add column if not exists return_label_cost numeric(12,2),
  add column if not exists return_label_cost_currency text not null default 'GBP',
  add column if not exists resolution_summary text,
  add column if not exists damage_assessment text,
  add column if not exists item_disposition text,
  add column if not exists item_disposition_notes text,
  add column if not exists customer_resolution_type text,
  add column if not exists refund_method text,
  add column if not exists refund_provider text,
  add column if not exists refund_amount numeric(12,2),
  add column if not exists refund_currency text not null default 'GBP',
  add column if not exists refund_reference text,
  add column if not exists replacement_asset_id uuid references public.inventory_assets(id) on delete set null,
  add column if not exists replacement_reference text,
  add column if not exists replacement_notes text;

alter table public.sales_customer_returns
  drop constraint if exists sales_customer_returns_return_label_cost_check,
  add constraint sales_customer_returns_return_label_cost_check
    check (return_label_cost is null or return_label_cost >= 0),
  drop constraint if exists sales_customer_returns_refund_amount_check,
  add constraint sales_customer_returns_refund_amount_check
    check (refund_amount is null or refund_amount >= 0),
  drop constraint if exists sales_customer_returns_item_disposition_check,
  add constraint sales_customer_returns_item_disposition_check
    check (item_disposition is null or item_disposition in (
      'Returned to Stock / Resale',
      'Sent to Auction',
      'Broken Down for Spares',
      'Sent for Repair',
      'Second-hand Spares Sale',
      'Written Off / Recycled',
      'Other'
    )),
  drop constraint if exists sales_customer_returns_customer_resolution_type_check,
  add constraint sales_customer_returns_customer_resolution_type_check
    check (customer_resolution_type is null or customer_resolution_type in (
      'Full Refund',
      'Partial Refund',
      'Replacement Item',
      'Refund and Replacement',
      'No Customer Payment',
      'Other'
    )),
  drop constraint if exists sales_customer_returns_refund_method_check,
  add constraint sales_customer_returns_refund_method_check
    check (refund_method is null or refund_method in (
      'Card Refund',
      'Bank Transfer',
      'Cash',
      'Store Credit',
      'Other',
      'Not Applicable'
    ));

create or replace function public.staff_record_sales_customer_return_label(
  p_return_id uuid,
  p_carrier text,
  p_tracking_number text default null,
  p_label_url text default null,
  p_label_cost numeric default null
)
returns public.sales_customer_returns
language plpgsql security definer set search_path=public,auth as $$
declare r public.sales_customer_returns%rowtype;
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;
  if nullif(trim(coalesce(p_carrier,'')),'') is null then
    raise exception 'Carrier is required';
  end if;
  if p_label_cost is not null and p_label_cost < 0 then
    raise exception 'Return label cost cannot be negative';
  end if;
  select * into r from public.sales_customer_returns where id=p_return_id for update;
  if not found then raise exception 'Customer return not found'; end if;
  if r.status not in ('Approved','Label Created') then
    raise exception 'Return label can only be recorded for an approved return';
  end if;

  update public.sales_customer_returns
  set status='Label Created',
      carrier=trim(p_carrier),
      tracking_number=nullif(trim(coalesce(p_tracking_number,'')),''),
      label_url=nullif(trim(coalesce(p_label_url,'')),''),
      label_created_at=coalesce(label_created_at,now()),
      return_label_cost=p_label_cost,
      updated_by=auth.uid(),
      updated_at=now()
  where id=r.id
  returning * into r;
  return r;
end; $$;

revoke all on function public.staff_record_sales_customer_return_label(uuid,text,text,text,numeric) from public,anon;
grant execute on function public.staff_record_sales_customer_return_label(uuid,text,text,text,numeric) to authenticated;

create or replace function public.staff_resolve_sales_customer_return(
  p_return_id uuid,
  p_resolution_summary text,
  p_damage_assessment text,
  p_item_disposition text,
  p_item_disposition_notes text default null,
  p_customer_resolution_type text default null,
  p_refund_method text default null,
  p_refund_provider text default null,
  p_refund_amount numeric default null,
  p_refund_reference text default null,
  p_replacement_asset_id uuid default null,
  p_replacement_reference text default null,
  p_replacement_notes text default null
)
returns public.sales_customer_returns
language plpgsql security definer set search_path=public,auth as $$
declare r public.sales_customer_returns%rowtype;
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;
  if nullif(trim(coalesce(p_resolution_summary,'')),'') is null then raise exception 'What happened / assessment is required'; end if;
  if nullif(trim(coalesce(p_damage_assessment,'')),'') is null then raise exception 'Damage or condition assessment is required'; end if;
  if nullif(trim(coalesce(p_item_disposition,'')),'') is null then raise exception 'Returned item outcome is required'; end if;
  if nullif(trim(coalesce(p_customer_resolution_type,'')),'') is null then raise exception 'Customer resolution is required'; end if;
  if p_refund_amount is not null and p_refund_amount < 0 then raise exception 'Refund amount cannot be negative'; end if;

  if p_customer_resolution_type in ('Full Refund','Partial Refund','Refund and Replacement') then
    if p_refund_amount is null or p_refund_amount <= 0 then raise exception 'A refund amount is required for the selected customer resolution'; end if;
    if nullif(trim(coalesce(p_refund_method,'')),'') is null or p_refund_method='Not Applicable' then raise exception 'Refund method is required when a refund is made'; end if;
  end if;

  if p_customer_resolution_type='Replacement Item'
     and p_replacement_asset_id is null
     and nullif(trim(coalesce(p_replacement_reference,'')),'') is null then
    raise exception 'Record the replacement asset or replacement reference';
  end if;

  if p_replacement_asset_id is not null and not exists(select 1 from public.inventory_assets where id=p_replacement_asset_id) then
    raise exception 'Replacement inventory asset not found';
  end if;

  select * into r from public.sales_customer_returns where id=p_return_id for update;
  if not found then raise exception 'Customer return not found'; end if;
  if r.status <> 'Item Received' then raise exception 'The returned item must be physically received before closure'; end if;

  update public.sales_customer_returns
  set status='Resolved',
      resolved_at=now(),
      resolution_summary=trim(p_resolution_summary),
      damage_assessment=trim(p_damage_assessment),
      item_disposition=trim(p_item_disposition),
      item_disposition_notes=nullif(trim(coalesce(p_item_disposition_notes,'')),''),
      customer_resolution_type=trim(p_customer_resolution_type),
      refund_method=nullif(trim(coalesce(p_refund_method,'')),''),
      refund_provider=nullif(trim(coalesce(p_refund_provider,'')),''),
      refund_amount=p_refund_amount,
      refund_reference=nullif(trim(coalesce(p_refund_reference,'')),''),
      replacement_asset_id=p_replacement_asset_id,
      replacement_reference=nullif(trim(coalesce(p_replacement_reference,'')),''),
      replacement_notes=nullif(trim(coalesce(p_replacement_notes,'')),''),
      updated_by=auth.uid(),
      updated_at=now()
  where id=r.id
  returning * into r;

  return r;
end; $$;

revoke all on function public.staff_resolve_sales_customer_return(uuid,text,text,text,text,text,text,text,numeric,text,uuid,text,text) from public,anon;
grant execute on function public.staff_resolve_sales_customer_return(uuid,text,text,text,text,text,text,text,numeric,text,uuid,text,text) to authenticated;

-- Prevent the legacy generic action from closing a physically received return
-- without the assessment and financial/accounting details above.
create or replace function public.staff_update_sales_customer_return(
  p_return_id uuid,
  p_action text,
  p_label_url text default null,
  p_carrier text default null,
  p_tracking_number text default null,
  p_refusal_reason text default null,
  p_staff_notes text default null
)
returns public.sales_customer_returns
language plpgsql security definer set search_path=public,auth as $$
declare r public.sales_customer_returns%rowtype;
declare a public.inventory_assets%rowtype;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then raise exception 'Active staff access required'; end if;
 select * into r from public.sales_customer_returns where id=p_return_id for update;
 if not found then raise exception 'Customer return not found'; end if;

 if p_action='approve' then
  update public.sales_customer_returns set status='Approved',staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='label' then
  update public.sales_customer_returns set status='Label Created',label_url=nullif(trim(p_label_url),''),carrier=nullif(trim(p_carrier),''),tracking_number=nullif(trim(p_tracking_number),''),label_created_at=now(),staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='collected' then
  if r.status <> 'Label Created' then raise exception 'Create the return label first'; end if;
  update public.sales_customer_returns set status='Collected',collected_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='received' then
  if r.status not in ('Collected','Label Created') then raise exception 'Return must be in transit before receipt'; end if;
  select * into a from public.inventory_assets where id=r.asset_id for update;
  update public.sales_customer_returns set status='Item Received',item_received_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
  update public.inventory_assets set status='Returned',previous_status=a.status,status_changed_at=now(),status_change_reason='Post-sale customer return received for review',status_changed_by=auth.uid(),updated_at=now() where id=a.id;
  if r.fulfilment_id is not null then update public.sales_fulfillments set status='Returned',updated_by=auth.uid(),updated_at=now() where id=r.fulfilment_id; end if;
 elsif p_action='resolve' then
  raise exception 'Complete the return assessment and financial closure before resolving this return';
 elsif p_action='refuse' then
  update public.sales_customer_returns set status='Refused',refused_at=now(),refusal_reason=nullif(trim(p_refusal_reason),''),staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
  if r.fulfilment_id is not null and r.item_received_at is null then
    update public.sales_fulfillments set status='Delivered',updated_by=auth.uid(),updated_at=now() where id=r.fulfilment_id;
  end if;
 else
  raise exception 'Unknown customer return action';
 end if;
 return r;
end; $$;