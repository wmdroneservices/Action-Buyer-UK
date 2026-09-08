-- Receipt workflow repair: physical receipt must create inventory when operational data was reset.
-- This replaces the previous false-success behaviour where the receipt RPC incremented its count
-- without checking whether an inventory asset existed.

create or replace function public.staff_mark_item_received_and_sync_inventory(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_item record;
  v_asset public.inventory_assets%rowtype;
  v_created integer := 0;
  v_updated integer := 0;
  v_reference text;
  v_txn text;
  v_customer_condition text;
  v_description text;
  v_notes text;
  v_catalog_product_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.staff_users su where su.user_id=v_uid) then
    raise exception 'Staff access required';
  end if;

  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.status not in ('shipping','collecting_items','ready_for_shipping','inspection') then
    raise exception 'Sale cannot be marked received from its current status';
  end if;

  update public.shipments
  set status='delivered', delivered_at=coalesce(delivered_at,now()), updated_at=now()
  where sale_id=p_sale_id and shipment_type='inbound' and status in ('label_created','in_transit');

  for v_item in
    select si.quote_item_id,si.amount,qi.manufacturer,qi.model,qi.item_name,qi.package,qi.item_data,v.condition as valuation_condition
    from public.sale_items si
    join public.quote_items qi on qi.id=si.quote_item_id
    left join public.valuations v on v.id=qi.valuation_id
    where si.sale_id=p_sale_id
    order by si.created_at
  loop
    select * into v_asset
    from public.inventory_assets ia
    where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id
    limit 1
    for update;

    if not found then
      v_customer_condition := nullif(trim(coalesce(v_item.item_data->>'condition','')), '');
      if v_customer_condition is null then
        v_customer_condition := nullif(trim(coalesce(v_item.valuation_condition,'')), '');
      end if;
      v_description := coalesce(nullif(trim(v_item.item_name),''),nullif(trim(v_item.model),''),'Purchased equipment');
      v_notes := 'Created when customer item was physically received from seller purchase ' || coalesce(v_sale.sale_reference,'');
      if coalesce((v_item.item_data->>'missingItems')::boolean,false) then v_notes := v_notes || '. Customer reported missing item(s).'; end if;
      if coalesce((v_item.item_data->>'damage')::boolean,false) then v_notes := v_notes || '. Customer reported damage.'; end if;
      if nullif(trim(coalesce(v_item.item_data->>'exceptionNotes','')),'') is not null then
        v_notes := v_notes || ' Exception notes: ' || trim(v_item.item_data->>'exceptionNotes') || '.';
      end if;

      v_catalog_product_id := public.resolve_quote_item_catalog_product(v_item.quote_item_id);
      v_reference := 'GCO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      v_txn := 'GCO-TXN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

      insert into public.inventory_assets(
        asset_reference,transaction_number,source_sale_id,source_quote_item_id,catalog_product_id,
        manufacturer,model,package_name,description,status,purchase_price,acquired_at,
        condition_grade,customer_condition,serial_number,notes,status_changed_at,status_change_reason,status_changed_by
      )
      values(
        v_reference,v_txn,p_sale_id,v_item.quote_item_id,v_catalog_product_id,
        coalesce(nullif(v_item.manufacturer,''),'Unknown'),
        coalesce(nullif(v_item.model,''),nullif(v_item.item_name,''),'Unknown item'),
        nullif(v_item.package,''),v_description,'Received',v_item.amount,now(),
        null,v_customer_condition,nullif(trim(coalesce(v_item.item_data->>'serialNumber','')),''),v_notes,
        now(),'Customer item received',v_uid
      )
      returning * into v_asset;
      v_created := v_created + 1;
    elsif v_asset.status='Awaiting Receipt' then
      update public.inventory_assets
      set status='Received', previous_status=v_asset.status, status_changed_at=now(),
          status_change_reason='Customer item received', status_changed_by=v_uid, updated_at=now()
      where id=v_asset.id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  if v_created + v_updated = 0 and not exists (
    select 1 from public.inventory_assets ia where ia.source_sale_id=p_sale_id
  ) then
    raise exception 'Sale has no sale items to create inventory from';
  end if;

  update public.sales
  set status='received',
      payment_status=case when payment_status='paid' then payment_status else 'awaiting_final_quote' end,
      updated_at=now()
  where id=p_sale_id;

  return jsonb_build_object(
    'sale_id',p_sale_id,
    'inventory_assets_created',v_created,
    'inventory_assets_updated',v_updated,
    'inventory_assets_total',(select count(*) from public.inventory_assets where source_sale_id=p_sale_id)
  );
end;
$function$;