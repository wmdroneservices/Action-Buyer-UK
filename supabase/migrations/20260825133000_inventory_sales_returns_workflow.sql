-- GearCashOut: purchase inventory -> inspection -> Send to Sales -> channel listings -> sold history -> customer returns.
-- This file records the production database changes applied for the workflow.

update public.inventory_assets ia
set customer_condition = coalesce(
  nullif(trim(ia.customer_condition),''),
  (select nullif(trim(coalesce(v.condition,'')),'') from public.quote_items qi left join public.valuations v on v.id=qi.valuation_id where qi.id=ia.source_quote_item_id),
  (select nullif(trim(coalesce(qi.item_data->>'condition','')),'') from public.quote_items qi where qi.id=ia.source_quote_item_id)
), updated_at=now();

update public.inventory_assets ia
set condition_grade=null, updated_at=now()
where not exists (select 1 from public.inventory_testing it where it.asset_id=ia.id and it.stage='inspection');

alter table public.inventory_assets add column if not exists transaction_number text;
alter table public.inventory_assets add column if not exists sent_to_sales_at timestamptz;
alter table public.inventory_assets add column if not exists sent_to_sales_by uuid references auth.users(id) on delete set null;
alter table public.inventory_assets add column if not exists sold_at timestamptz;
alter table public.inventory_assets add column if not exists sold_price numeric;
alter table public.inventory_assets add column if not exists sold_channel text;
alter table public.inventory_assets add column if not exists sold_listing_id uuid;

update public.inventory_assets set transaction_number='GCO-TXN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where transaction_number is null or transaction_number='';
alter table public.inventory_assets alter column transaction_number set not null;
create unique index if not exists inventory_assets_transaction_number_key on public.inventory_assets(transaction_number);

alter table public.inventory_assets drop constraint if exists inventory_assets_status_check;
alter table public.inventory_assets add constraint inventory_assets_status_check check (status = any (array[
  'Awaiting Receipt','Received','Inspection Required','Testing','Repair Required','Ready for Resale','Sent to Sales','Listed','Reserved','Sold','Returned','Dispatched','Completed','Held','Written Off'
]));

create or replace function public.protect_inventory_customer_condition()
returns trigger language plpgsql security definer set search_path=public as $$
declare expected text;
begin
  if tg_op='UPDATE' then
    if old.customer_condition is not null then
      new.customer_condition := old.customer_condition;
    elsif new.customer_condition is not null then
      select coalesce(nullif(trim(coalesce(qi.item_data->>'condition','')),''),nullif(trim(coalesce(v.condition,'')),'')) into expected
      from public.quote_items qi left join public.valuations v on v.id=qi.valuation_id
      where qi.id=old.source_quote_item_id;
      if expected is null or new.customer_condition <> expected then new.customer_condition := old.customer_condition; end if;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists inventory_assets_protect_customer_condition on public.inventory_assets;
create trigger inventory_assets_protect_customer_condition before update on public.inventory_assets for each row execute function public.protect_inventory_customer_condition();

create or replace function public.staff_mark_sale_paid_and_create_inventory(p_sale_id uuid,p_payment_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_sale public.sales%rowtype; v_item record; v_asset public.inventory_assets%rowtype; v_result jsonb:='[]'::jsonb; v_reference text; v_txn text; v_description text; v_notes text; v_customer_condition text;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.archived_at is not null then raise exception 'Archived sales cannot be paid from the active workflow'; end if;
  if v_sale.status<>'payment_due' then raise exception 'Payment can only be sent after the final quote has been accepted'; end if;
  if v_sale.bank_details_confirmed_at is null then raise exception 'Customer bank details have not been confirmed'; end if;
  update public.sales set payment_status='paid',payment_sent_at=now(),payment_reference=nullif(trim(p_payment_reference),''),status='completed',updated_at=now() where id=p_sale_id;
  for v_item in select si.quote_item_id,si.amount,qi.manufacturer,qi.model,qi.item_name,qi.package,qi.item_data,v.condition as valuation_condition from public.sale_items si join public.quote_items qi on qi.id=si.quote_item_id left join public.valuations v on v.id=qi.valuation_id where si.sale_id=p_sale_id order by si.created_at loop
    v_customer_condition := nullif(trim(coalesce(v_item.item_data->>'condition','')), '');
    if v_customer_condition is null then v_customer_condition := nullif(trim(coalesce(v_item.valuation_condition,'')), ''); end if;
    v_description := coalesce(nullif(trim(v_item.item_name),''),nullif(trim(v_item.model),''),'Purchased equipment');
    v_notes := 'Created from seller purchase ' || coalesce(v_sale.sale_reference,'');
    if coalesce((v_item.item_data->>'missingItems')::boolean,false) then v_notes := v_notes || '. Customer reported missing item(s).'; end if;
    if coalesce((v_item.item_data->>'damage')::boolean,false) then v_notes := v_notes || '. Customer reported damage.'; end if;
    if nullif(trim(coalesce(v_item.item_data->>'exceptionNotes','')),'') is not null then v_notes := v_notes || ' Exception notes: ' || trim(v_item.item_data->>'exceptionNotes') || '.'; end if;
    if not exists(select 1 from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id) then
      v_reference:='GCO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      v_txn:='GCO-TXN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      insert into public.inventory_assets(asset_reference,transaction_number,source_sale_id,source_quote_item_id,manufacturer,model,package_name,description,status,purchase_price,acquired_at,condition_grade,customer_condition,serial_number,notes)
      values(v_reference,v_txn,p_sale_id,v_item.quote_item_id,coalesce(nullif(v_item.manufacturer,''),'Unknown'),coalesce(nullif(v_item.model,''),nullif(v_item.item_name,''),'Unknown item'),nullif(v_item.package,''),v_description,'Received',v_item.amount,coalesce((select payment_sent_at from public.sales where id=p_sale_id),now()),null,v_customer_condition,nullif(trim(coalesce(v_item.item_data->>'serialNumber','')), ''),v_notes)
      returning * into v_asset;
    else
      select * into v_asset from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id limit 1;
      update public.inventory_assets set description=coalesce(nullif(description,''),v_description),customer_condition=coalesce(customer_condition,v_customer_condition),serial_number=coalesce(serial_number,nullif(trim(coalesce(v_item.item_data->>'serialNumber','')), '')),notes=case when notes is null or notes='' or notes like 'Created when seller payment was confirmed.%' then v_notes else notes end,updated_at=now() where id=v_asset.id returning * into v_asset;
    end if;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('inventory_asset_id',v_asset.id,'asset_reference',v_asset.asset_reference,'transaction_number',v_asset.transaction_number));
  end loop;
  if jsonb_array_length(v_result)=0 then raise exception 'Sale has no sale items to create inventory from'; end if;
  return v_result;
end; $$;
revoke all on function public.staff_mark_sale_paid_and_create_inventory(uuid,text) from public,anon;
grant execute on function public.staff_mark_sale_paid_and_create_inventory(uuid,text) to authenticated;

create or replace function public.staff_send_inventory_to_sales(p_asset_id uuid)
returns public.inventory_assets language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; i public.inventory_testing%rowtype; t public.inventory_testing%rowtype;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status<>'Ready for Resale' then raise exception 'Asset must be Ready for Resale before it can be sent to Sales'; end if;
  select * into i from public.inventory_testing where asset_id=p_asset_id and stage='inspection' order by created_at desc limit 1;
  if not found or i.result<>'Passed' then raise exception 'Initial inspection must be completed and passed'; end if;
  select * into t from public.inventory_testing where asset_id=p_asset_id and stage='testing' order by created_at desc limit 1;
  if not found or not (coalesce(t.flight_test,'') in ('Passed','Not Applicable') and coalesce(t.camera_test,'') in ('Passed','Not Applicable') and coalesce(t.battery_health,'') in ('Good','Not Applicable')) then raise exception 'Technical testing must be completed and passed'; end if;
  if a.customer_missing_items and not a.missing_items_resolved then raise exception 'Resolve customer-reported missing items before sending the item to Sales'; end if;
  if nullif(trim(coalesce(a.condition_grade,'')),'') is null then raise exception 'Staff condition must be recorded during inspection'; end if;
  update public.inventory_assets set status='Sent to Sales',previous_status=a.status,status_changed_at=now(),status_change_reason='Staff sent asset to Sales after inspection and testing',status_changed_by=auth.uid(),sent_to_sales_at=now(),sent_to_sales_by=auth.uid(),updated_at=now() where id=p_asset_id returning * into a;
  return a;
end; $$;
revoke all on function public.staff_send_inventory_to_sales(uuid) from public,anon;
grant execute on function public.staff_send_inventory_to_sales(uuid) to authenticated;

create or replace function public.staff_mark_resale_listing_sold(p_listing_id uuid,p_sold_price numeric,p_selling_fees numeric default 0,p_shipping_cost numeric default 0)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare l public.resale_listings%rowtype; a public.inventory_assets%rowtype; result jsonb;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  if p_sold_price is null or p_sold_price < 0 then raise exception 'Sold price must be zero or greater'; end if;
  select * into l from public.resale_listings where id=p_listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  select * into a from public.inventory_assets where id=l.asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if l.status='Sold' then return jsonb_build_object('listing_id',l.id,'asset_id',a.id,'status','Sold'); end if;
  if l.status not in ('Published','Reserved') then raise exception 'Only a published or reserved sales-channel listing can be marked sold'; end if;
  if a.status not in ('Sent to Sales','Listed','Reserved') then raise exception 'Asset is not currently in the Sales workflow'; end if;
  update public.resale_listings set status='Sold',sold_price=p_sold_price,selling_fees=coalesce(p_selling_fees,0),shipping_cost=coalesce(p_shipping_cost,0),sold_at=now(),updated_at=now() where id=l.id;
  update public.resale_listings set status='Delist Required',updated_at=now() where asset_id=a.id and id<>l.id and status in ('Draft','Ready For Listing','Published','Reserved','Delist Required');
  update public.inventory_assets set status='Sold',previous_status=a.status,status_changed_at=now(),status_change_reason='Product sold through sales channel',status_changed_by=auth.uid(),sold_at=now(),sold_price=p_sold_price,sold_channel=l.sales_channel,sold_listing_id=l.id,updated_at=now() where id=a.id returning * into a;
  result:=jsonb_build_object('listing_id',l.id,'asset_id',a.id,'transaction_number',a.transaction_number,'status',a.status,'sold_price',p_sold_price,'sold_channel',l.sales_channel);
  return result;
end; $$;
revoke all on function public.staff_mark_resale_listing_sold(uuid,numeric,numeric,numeric) from public,anon;
grant execute on function public.staff_mark_resale_listing_sold(uuid,numeric,numeric,numeric) to authenticated;

create table if not exists public.customer_return_requests (
  id uuid primary key default gen_random_uuid(), return_reference text not null unique, asset_id uuid not null references public.inventory_assets(id) on delete restrict, sale_id uuid not null references public.sales(id) on delete restrict, customer_id uuid not null references auth.users(id) on delete restrict, reason text not null, customer_notes text, status text not null default 'Requested', negotiation_notes text, negotiation_attempted_at timestamptz, accepted_at timestamptz, refused_at timestamptz, refusal_reason text, label_url text, label_carrier text, label_tracking_number text, label_issued_at timestamptz, item_received_at timestamptz, return_authorised_at timestamptz, return_authorised_by uuid references auth.users(id) on delete set null, return_to_customer_carrier text, return_to_customer_tracking_number text, return_to_customer_sent_at timestamptz, staff_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint customer_return_requests_status_check check (status = any(array['Requested','Negotiation','Accepted','Label Sent','Item Received','Return Authorised','Return Refused','Return Sent Back','Closed']))
);
create index if not exists customer_return_requests_customer_idx on public.customer_return_requests(customer_id,created_at desc);
create index if not exists customer_return_requests_status_idx on public.customer_return_requests(status,created_at desc);

create table if not exists public.inventory_return_data (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null unique references public.customer_return_requests(id) on delete restrict, asset_id uuid not null references public.inventory_assets(id) on delete restrict, sale_id uuid not null references public.sales(id) on delete restrict, return_reference text not null unique, transaction_number text not null, authorised_at timestamptz not null default now(), product_snapshot jsonb not null default '{}'::jsonb, customer_snapshot jsonb not null default '{}'::jsonb, financial_snapshot jsonb not null default '{}'::jsonb, inspection_snapshot jsonb not null default '[]'::jsonb, photo_snapshot jsonb not null default '[]'::jsonb, expense_snapshot jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create index if not exists inventory_return_data_asset_idx on public.inventory_return_data(asset_id,authorised_at desc);

alter table public.customer_return_requests enable row level security;
alter table public.inventory_return_data enable row level security;
drop policy if exists customer_return_requests_customer_select on public.customer_return_requests;
drop policy if exists customer_return_requests_staff_all on public.customer_return_requests;
drop policy if exists inventory_return_data_staff_all on public.inventory_return_data;
create policy customer_return_requests_customer_select on public.customer_return_requests for select to authenticated using (customer_id=auth.uid());
create policy customer_return_requests_staff_all on public.customer_return_requests for all to authenticated using (exists(select 1 from public.staff_users s where s.user_id=auth.uid())) with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));
create policy inventory_return_data_staff_all on public.inventory_return_data for all to authenticated using (exists(select 1 from public.staff_users s where s.user_id=auth.uid())) with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));

create or replace function public.customer_get_returnable_items(p_sale_id uuid)
returns table(asset_id uuid,transaction_number text,manufacturer text,model text,package_name text,status text,sold_at timestamptz,sold_price numeric,return_reference text,return_status text)
language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if not exists(select 1 from public.sales where id=p_sale_id and user_id=auth.uid()) then raise exception 'Sale not found'; end if;
  return query select a.id,a.transaction_number,a.manufacturer,a.model,a.package_name,a.status,a.sold_at,a.sold_price,r.return_reference,r.status from public.inventory_assets a left join lateral (select cr.return_reference,cr.status from public.customer_return_requests cr where cr.asset_id=a.id order by cr.created_at desc limit 1) r on true where a.source_sale_id=p_sale_id and a.status in ('Sold','Returned') order by a.created_at;
end; $$;
revoke all on function public.customer_get_returnable_items(uuid) from public,anon;
grant execute on function public.customer_get_returnable_items(uuid) to authenticated;

create or replace function public.customer_request_return(p_asset_id uuid,p_reason text,p_notes text default null)
returns public.customer_return_requests language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; r public.customer_return_requests%rowtype; sale_user uuid;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select * into a from public.inventory_assets where id=p_asset_id for share;
  if not found then raise exception 'Product transaction not found'; end if;
  if a.status <> 'Sold' then raise exception 'This item is not currently eligible for a customer return'; end if;
  select user_id into sale_user from public.sales where id=a.source_sale_id;
  if sale_user is distinct from auth.uid() then raise exception 'You can only request a return for your own purchase'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Return reason is required'; end if;
  if exists(select 1 from public.customer_return_requests where asset_id=p_asset_id and status not in ('Closed','Return Refused','Return Sent Back')) then raise exception 'A return request is already open for this item'; end if;
  insert into public.customer_return_requests(return_reference,asset_id,sale_id,customer_id,reason,customer_notes,status) values('RET-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_asset_id,a.source_sale_id,auth.uid(),trim(p_reason),nullif(trim(coalesce(p_notes,'')),''),'Requested') returning * into r;
  return r;
end; $$;
revoke all on function public.customer_request_return(uuid,text,text) from public,anon;
grant execute on function public.customer_request_return(uuid,text,text) to authenticated;

create or replace function public.staff_update_customer_return(p_return_id uuid,p_action text,p_notes text default null,p_refusal_reason text default null,p_label_url text default null,p_label_carrier text default null,p_label_tracking text default null,p_label_issued_at timestamptz default null,p_return_to_customer_carrier text default null,p_return_to_customer_tracking text default null)
returns public.customer_return_requests language plpgsql security definer set search_path=public,auth as $$
declare r public.customer_return_requests%rowtype;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into r from public.customer_return_requests where id=p_return_id for update;
  if not found then raise exception 'Return request not found'; end if;
  if p_action='negotiate' then update public.customer_return_requests set status='Negotiation',negotiation_notes=nullif(trim(coalesce(p_notes,'')),''),negotiation_attempted_at=now(),staff_notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),staff_notes),updated_at=now() where id=p_return_id returning * into r;
  elsif p_action='accept' then update public.customer_return_requests set status='Accepted',accepted_at=now(),staff_notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),staff_notes),updated_at=now() where id=p_return_id returning * into r;
  elsif p_action='label' then update public.customer_return_requests set status='Label Sent',label_url=nullif(trim(coalesce(p_label_url,'')),''),label_carrier=nullif(trim(coalesce(p_label_carrier,'')),''),label_tracking_number=nullif(trim(coalesce(p_label_tracking,'')),''),label_issued_at=coalesce(p_label_issued_at,now()),updated_at=now() where id=p_return_id returning * into r;
  elsif p_action='received' then update public.customer_return_requests set status='Item Received',item_received_at=now(),updated_at=now() where id=p_return_id returning * into r;
  elsif p_action='refuse' then update public.customer_return_requests set status='Return Refused',refused_at=now(),refusal_reason=nullif(trim(coalesce(p_refusal_reason,'')),''),staff_notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),staff_notes),updated_at=now() where id=p_return_id returning * into r;
  elsif p_action='sent_back' then update public.customer_return_requests set status='Return Sent Back',return_to_customer_carrier=nullif(trim(coalesce(p_return_to_customer_carrier,'')),''),return_to_customer_tracking_number=nullif(trim(coalesce(p_return_to_customer_tracking,'')),''),return_to_customer_sent_at=now(),updated_at=now() where id=p_return_id returning * into r;
  else raise exception 'Unknown return action'; end if;
  return r;
end; $$;
revoke all on function public.staff_update_customer_return(uuid,text,text,text,text,text,text,timestamptz,text,text) from public,anon;
grant execute on function public.staff_update_customer_return(uuid,text,text,text,text,text,text,timestamptz,text,text) to authenticated;

create or replace function public.staff_authorise_customer_return(p_return_id uuid)
returns public.inventory_return_data language plpgsql security definer set search_path=public,auth as $$
declare r public.customer_return_requests%rowtype; a public.inventory_assets%rowtype; s public.sales%rowtype; v_quote_snapshot jsonb; out public.inventory_return_data%rowtype;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into r from public.customer_return_requests where id=p_return_id for update;
  if not found then raise exception 'Return request not found'; end if;
  if r.status<>'Item Received' then raise exception 'The returned item must be received before return authorisation'; end if;
  select * into a from public.inventory_assets where id=r.asset_id for update;
  select * into s from public.sales where id=r.sale_id;
  select to_jsonb(q) into v_quote_snapshot from public.quote_items q where q.id=a.source_quote_item_id;
  insert into public.inventory_return_data(return_request_id,asset_id,sale_id,return_reference,transaction_number,product_snapshot,customer_snapshot,financial_snapshot,inspection_snapshot,photo_snapshot,expense_snapshot)
  values(r.id,a.id,r.sale_id,r.return_reference,a.transaction_number,
    jsonb_build_object('manufacturer',a.manufacturer,'model',a.model,'package_name',a.package_name,'customer_condition',a.customer_condition,'staff_condition',a.condition_grade,'serial_number',a.serial_number,'final_package_contents',a.final_package_contents,'items_added_replaced',a.items_added_replaced,'package_notes',a.package_notes,'asset_reference',a.asset_reference,'quote_item',coalesce(v_quote_snapshot,'{}'::jsonb)),
    jsonb_build_object('customer_id',r.customer_id,'sale_id',r.sale_id,'sale_reference',s.sale_reference,'reason',r.reason,'customer_notes',r.customer_notes),
    jsonb_build_object('purchase_price',a.purchase_price,'sold_price',a.sold_price,'sold_channel',a.sold_channel,'sold_at',a.sold_at,'payment_reference',s.payment_reference),
    coalesce((select jsonb_agg(to_jsonb(it) order by it.created_at) from public.inventory_testing it where it.asset_id=a.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(ev) order by ev.created_at) from public.inventory_evidence ev where ev.asset_id=a.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(ex) order by ex.incurred_at) from public.inventory_expenses ex where ex.asset_id=a.id),'[]'::jsonb)
  ) returning * into out;
  update public.customer_return_requests set status='Return Authorised',return_authorised_at=now(),return_authorised_by=auth.uid(),updated_at=now() where id=r.id;
  update public.inventory_assets set status='Returned',previous_status=a.status,status_changed_at=now(),status_change_reason='Customer return authorised and moved to return database',status_changed_by=auth.uid(),updated_at=now() where id=a.id;
  return out;
end; $$;
revoke all on function public.staff_authorise_customer_return(uuid) from public,anon;
grant execute on function public.staff_authorise_customer_return(uuid) to authenticated;
