-- GearCashOut: completing a repair also completes the controlled post-repair test.
-- Applied live on 6 September 2026.

create or replace function public.staff_complete_inventory_repair(
  p_asset_id uuid,
  p_fault_description text,
  p_repair_description text,
  p_provider_type text default 'Internal',
  p_provider_name text default null,
  p_repair_cost numeric default 0,
  p_repaired_at timestamptz default now(),
  p_evidence_paths jsonb default '[]'::jsonb
)
returns public.inventory_repairs
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  a public.inventory_assets%rowtype;
  r public.inventory_repairs%rowtype;
  e_id uuid:=null;
  v_cost numeric:=coalesce(p_repair_cost,0);
  v_fault text:=nullif(trim(coalesce(p_fault_description,'')), '');
  v_repair text:=nullif(trim(coalesce(p_repair_description,'')), '');
  v_provider text:=coalesce(nullif(trim(p_provider_type),''),'Internal');
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid() and active=true) then
    raise exception 'Active staff access required';
  end if;
  if v_fault is null then raise exception 'Repair fault description is required'; end if;
  if v_repair is null then raise exception 'Repair work description is required'; end if;
  if v_provider not in ('Internal','External','Manufacturer / Service Centre') then
    raise exception 'Invalid repair provider type';
  end if;
  if v_cost<0 then raise exception 'Repair cost cannot be negative'; end if;
  if p_evidence_paths is null or jsonb_typeof(p_evidence_paths)<>'array' then
    raise exception 'Repair evidence paths must be a JSON array';
  end if;

  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status<>'Repair Required' then
    raise exception 'Asset must currently be Repair Required before a repair can be completed';
  end if;

  if v_cost>0 then
    insert into public.inventory_expenses(asset_id,category,amount,description,incurred_at)
    values(p_asset_id,'Repair',v_cost,'Repair: '||v_repair,coalesce(p_repaired_at,now()))
    returning id into e_id;
  end if;

  insert into public.inventory_repairs(
    asset_id,fault_description,repair_description,provider_type,provider_name,
    repair_cost,repaired_at,completed_by,evidence_paths,expense_id
  )
  values(
    p_asset_id,v_fault,v_repair,v_provider,nullif(trim(coalesce(p_provider_name,'')), ''),
    v_cost,coalesce(p_repaired_at,now()),auth.uid(),p_evidence_paths,e_id
  )
  returning * into r;

  insert into public.inventory_testing(
    asset_id,stage,result,visual_condition,missing_items,damage_notes,
    serial_verified,accessories_verified,flight_test,camera_test,battery_health,
    notes,created_by,updated_by
  )
  values(
    p_asset_id,'testing','Passed',a.condition_grade,null,null,null,null,
    'Not Applicable','Not Applicable','Not Applicable',
    'Repair completed and recorded; repair completion counts as the post-repair testing step.',
    auth.uid(),auth.uid()
  );

  update public.inventory_assets
  set
    status='Ready for Resale',
    previous_status='Repair Required',
    status_changed_at=now(),
    status_change_reason='Repair completed and recorded; repair completion also marks post-repair testing passed',
    status_changed_by=auth.uid(),
    updated_at=now()
  where id=p_asset_id;

  return r;
end;
$$;

revoke all on function public.staff_complete_inventory_repair(
  uuid,text,text,text,text,numeric,timestamptz,jsonb
) from public;

grant execute on function public.staff_complete_inventory_repair(
  uuid,text,text,text,text,numeric,timestamptz,jsonb
) to authenticated;
