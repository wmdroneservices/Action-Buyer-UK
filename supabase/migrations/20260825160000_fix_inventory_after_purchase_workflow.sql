-- GearCashOut: preserve purchase-source description/condition details in inventory and repair the after-purchase lifecycle.

alter table public.inventory_assets add column if not exists description text;

create or replace function public.staff_mark_sale_paid_and_create_inventory(p_sale_id uuid,p_payment_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_asset public.inventory_assets%rowtype;
  v_result jsonb:='[]'::jsonb;
  v_reference text;
  v_description text;
  v_notes text;
  v_condition text;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.archived_at is not null then raise exception 'Archived sales cannot be paid from the active workflow'; end if;
  if v_sale.status<>'payment_due' then raise exception 'Payment can only be sent after the final quote has been accepted'; end if;
  if v_sale.bank_details_confirmed_at is null then raise exception 'Customer bank details have not been confirmed'; end if;

  update public.sales set payment_status='paid',payment_sent_at=now(),payment_reference=nullif(trim(p_payment_reference),''),status='completed',updated_at=now() where id=p_sale_id;

  for v_item in
    select si.quote_item_id,si.amount,qi.manufacturer,qi.model,qi.item_name,qi.package,qi.item_data,v.condition as valuation_condition
    from public.sale_items si
    join public.quote_items qi on qi.id=si.quote_item_id
    left join public.valuations v on v.id=qi.valuation_id
    where si.sale_id=p_sale_id order by si.created_at
  loop
    v_condition := nullif(trim(coalesce(v_item.valuation_condition,'')), '');
    if v_condition is null then v_condition := nullif(trim(coalesce(v_item.item_data->>'condition','')), ''); end if;
    v_description := coalesce(nullif(trim(v_item.item_name),''),nullif(trim(v_item.model),''),'Purchased equipment');
    v_notes := 'Created from seller purchase ' || coalesce(v_sale.sale_reference,'');
    if coalesce((v_item.item_data->>'missingItems')::boolean,false) then v_notes := v_notes || '. Customer reported missing item(s).'; end if;
    if coalesce((v_item.item_data->>'damage')::boolean,false) then v_notes := v_notes || '. Customer reported damage.'; end if;
    if nullif(trim(coalesce(v_item.item_data->>'exceptionNotes','')),'') is not null then v_notes := v_notes || ' Exception notes: ' || trim(v_item.item_data->>'exceptionNotes') || '.'; end if;

    if not exists(select 1 from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id) then
      v_reference:='GCO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      insert into public.inventory_assets(asset_reference,source_sale_id,source_quote_item_id,manufacturer,model,package_name,description,status,purchase_price,acquired_at,condition_grade,serial_number,notes)
      values(v_reference,p_sale_id,v_item.quote_item_id,coalesce(nullif(v_item.manufacturer,''),'Unknown'),coalesce(nullif(v_item.model,''),nullif(v_item.item_name,''),'Unknown item'),nullif(v_item.package,''),v_description,'Received',v_item.amount,now(),v_condition,nullif(trim(coalesce(v_item.item_data->>'serialNumber','')), ''),v_notes)
      returning * into v_asset;
    else
      select * into v_asset from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id limit 1;
      update public.inventory_assets set description=coalesce(nullif(description,''),v_description),condition_grade=coalesce(condition_grade,v_condition),serial_number=coalesce(serial_number,nullif(trim(coalesce(v_item.item_data->>'serialNumber','')), '')),notes=case when notes is null or notes='' or notes like 'Created when seller payment was confirmed.%' then v_notes else notes end,updated_at=now() where id=v_asset.id returning * into v_asset;
    end if;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('inventory_asset_id',v_asset.id,'asset_reference',v_asset.asset_reference));
  end loop;

  if jsonb_array_length(v_result)=0 then raise exception 'Sale has no sale items to create inventory from'; end if;
  return v_result;
end; $$;

revoke all on function public.staff_mark_sale_paid_and_create_inventory(uuid,text) from public,anon;
grant execute on function public.staff_mark_sale_paid_and_create_inventory(uuid,text) to authenticated;

update public.inventory_assets ia
set description=coalesce(nullif(ia.description,''),coalesce(nullif((select qi.item_name from public.quote_items qi where qi.id=ia.source_quote_item_id),''),nullif((select qi.model from public.quote_items qi where qi.id=ia.source_quote_item_id),''),'Purchased equipment')),
    condition_grade=coalesce(ia.condition_grade,(select nullif(trim(coalesce(v.condition,'')),'') from public.quote_items qi left join public.valuations v on v.id=qi.valuation_id where qi.id=ia.source_quote_item_id),(select nullif(trim(coalesce(qi.item_data->>'condition','')),'') from public.quote_items qi where qi.id=ia.source_quote_item_id)),
    serial_number=coalesce(ia.serial_number,(select nullif(trim(coalesce(qi.item_data->>'serialNumber','')), '') from public.quote_items qi where qi.id=ia.source_quote_item_id)),
    notes=case when ia.notes is null or ia.notes='' or ia.notes like 'Created when seller payment was confirmed.%' then
      'Created from seller purchase ' || coalesce((select s.sale_reference from public.sales s where s.id=ia.source_sale_id),'') ||
      case when coalesce(((select qi.item_data->>'missingItems' from public.quote_items qi where qi.id=ia.source_quote_item_id))::boolean,false) then '. Customer reported missing item(s).' else '' end ||
      case when coalesce(((select qi.item_data->>'damage' from public.quote_items qi where qi.id=ia.source_quote_item_id))::boolean,false) then ' Customer reported damage.' else '' end ||
      case when nullif(trim(coalesce((select qi.item_data->>'exceptionNotes' from public.quote_items qi where qi.id=ia.source_quote_item_id),'')),'') is not null then ' Exception notes: ' || trim((select qi.item_data->>'exceptionNotes' from public.quote_items qi where qi.id=ia.source_quote_item_id)) || '.' else '' end
      else ia.notes end,
    updated_at=now();
