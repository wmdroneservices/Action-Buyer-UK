-- GearCashOut: explicit Repair Required workflow and post-repair release
-- Applied live to Supabase on 6 September 2026.

create table if not exists public.inventory_repairs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.inventory_assets(id) on delete cascade,
  fault_description text not null check (length(trim(fault_description)) > 0),
  repair_description text not null check (length(trim(repair_description)) > 0),
  provider_type text not null default 'Internal' check (provider_type in ('Internal','External','Manufacturer / Service Centre')),
  provider_name text,
  repair_cost numeric not null default 0 check (repair_cost >= 0),
  repaired_at timestamptz not null default now(),
  completed_by uuid not null,
  evidence_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_paths) = 'array'),
  expense_id uuid references public.inventory_expenses(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_repairs_asset_created_idx on public.inventory_repairs(asset_id, repaired_at desc);
alter table public.inventory_repairs enable row level security;

drop policy if exists inventory_repairs_staff_select on public.inventory_repairs;
create policy inventory_repairs_staff_select on public.inventory_repairs for select using (exists (select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true));

drop policy if exists inventory_repairs_staff_insert on public.inventory_repairs;
create policy inventory_repairs_staff_insert on public.inventory_repairs for insert with check (exists (select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true) and completed_by=auth.uid());

create or replace function public.staff_complete_inventory_repair(p_asset_id uuid,p_fault_description text,p_repair_description text,p_provider_type text default 'Internal',p_provider_name text default null,p_repair_cost numeric default 0,p_repaired_at timestamptz default now(),p_evidence_paths jsonb default '[]'::jsonb)
returns public.inventory_repairs language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; r public.inventory_repairs%rowtype; e_id uuid:=null; v_cost numeric:=coalesce(p_repair_cost,0); v_fault text:=nullif(trim(coalesce(p_fault_description,'')),''), v_repair text:=nullif(trim(coalesce(p_repair_description,'')),''), v_provider text:=coalesce(nullif(trim(p_provider_type),''),'Internal');
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid() and active=true) then raise exception 'Active staff access required'; end if;
  if v_fault is null then raise exception 'Repair fault description is required'; end if;
  if v_repair is null then raise exception 'Repair work description is required'; end if;
  if v_provider not in ('Internal','External','Manufacturer / Service Centre') then raise exception 'Invalid repair provider type'; end if;
  if v_cost<0 then raise exception 'Repair cost cannot be negative'; end if;
  if p_evidence_paths is null or jsonb_typeof(p_evidence_paths)<>'array' then raise exception 'Repair evidence paths must be a JSON array'; end if;
  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status<>'Repair Required' then raise exception 'Asset must currently be Repair Required before a repair can be completed'; end if;
  if v_cost>0 then insert into public.inventory_expenses(asset_id,category,amount,description,incurred_at) values(p_asset_id,'Repair',v_cost,'Repair: '||v_repair,coalesce(p_repaired_at,now())) returning id into e_id; end if;
  insert into public.inventory_repairs(asset_id,fault_description,repair_description,provider_type,provider_name,repair_cost,repaired_at,completed_by,evidence_paths,expense_id) values(p_asset_id,v_fault,v_repair,v_provider,nullif(trim(coalesce(p_provider_name,'')),''),v_cost,coalesce(p_repaired_at,now()),auth.uid(),p_evidence_paths,e_id) returning * into r;
  update public.inventory_assets set status='Testing',previous_status='Repair Required',status_changed_at=now(),status_change_reason='Repair completed and recorded; post-repair testing required',status_changed_by=auth.uid(),updated_at=now() where id=p_asset_id;
  return r;
end;
$$;

revoke all on function public.staff_complete_inventory_repair(uuid,text,text,text,text,numeric,timestamptz,jsonb) from public;
grant execute on function public.staff_complete_inventory_repair(uuid,text,text,text,text,numeric,timestamptz,jsonb) to authenticated;
