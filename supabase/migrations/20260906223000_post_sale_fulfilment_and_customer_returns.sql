-- Post-sale fulfilment and buyer returns. Separate from purchase_return_cases.
create table if not exists public.sales_fulfillments (
 id uuid primary key default gen_random_uuid(),asset_id uuid not null unique references public.inventory_assets(id) on delete restrict,listing_id uuid references public.resale_listings(id) on delete set null,fulfilment_reference text not null unique,status text not null default 'Awaiting Shipping' check(status in ('Awaiting Shipping','Label Created','Ready for Collection','Collected','Delivered','Return Open','Returned','Closed')),buyer_name text,buyer_email text,shipping_address text,carrier text,tracking_number text,label_url text,label_created_at timestamptz,collected_at timestamptz,delivered_at timestamptz,notes text,created_by uuid references auth.users(id) on delete set null,updated_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.sales_customer_returns (
 id uuid primary key default gen_random_uuid(),return_reference text not null unique,asset_id uuid not null references public.inventory_assets(id) on delete restrict,fulfilment_id uuid references public.sales_fulfillments(id) on delete set null,status text not null default 'Requested' check(status in ('Requested','Approved','Label Created','Collected','Item Received','Resolved','Refused','Closed')),reason text not null,customer_notes text,buyer_name text,buyer_email text,carrier text,tracking_number text,label_url text,label_created_at timestamptz,collected_at timestamptz,item_received_at timestamptz,resolved_at timestamptz,refused_at timestamptz,refusal_reason text,staff_notes text,created_by uuid references auth.users(id) on delete set null,updated_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists sales_fulfillments_status_idx on public.sales_fulfillments(status,updated_at desc);
create unique index if not exists sales_customer_returns_one_open_asset_idx on public.sales_customer_returns(asset_id) where status not in ('Resolved','Refused','Closed');
create index if not exists sales_customer_returns_status_idx on public.sales_customer_returns(status,updated_at desc);
alter table public.sales_fulfillments enable row level security;
alter table public.sales_customer_returns enable row level security;
drop policy if exists sales_fulfillments_staff_all on public.sales_fulfillments;
create policy sales_fulfillments_staff_all on public.sales_fulfillments for all to authenticated using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true)) with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true));
drop policy if exists sales_customer_returns_staff_all on public.sales_customer_returns;
create policy sales_customer_returns_staff_all on public.sales_customer_returns for all to authenticated using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true)) with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true));

create or replace function public.staff_create_sales_fulfillment(p_asset_id uuid,p_listing_id uuid default null,p_buyer_name text default null,p_buyer_email text default null,p_shipping_address text default null,p_carrier text default null,p_tracking_number text default null,p_label_url text default null,p_notes text default null)
returns public.sales_fulfillments language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; f public.sales_fulfillments%rowtype;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then raise exception 'Active staff access required'; end if;
 select * into a from public.inventory_assets where id=p_asset_id for update;
 if not found then raise exception 'Inventory asset not found'; end if;
 if a.status <> 'Sold' then raise exception 'Only a sold item can enter post-sale fulfilment'; end if;
 select * into f from public.sales_fulfillments where asset_id=p_asset_id for update;
 if found then
  if f.status in ('Delivered','Return Open','Returned','Closed') then raise exception 'This fulfilment can no longer be replaced by a new shipping label'; end if;
  update public.sales_fulfillments set listing_id=coalesce(p_listing_id,f.listing_id),buyer_name=coalesce(nullif(trim(p_buyer_name),''),f.buyer_name),buyer_email=coalesce(nullif(trim(p_buyer_email),''),f.buyer_email),shipping_address=coalesce(nullif(trim(p_shipping_address),''),f.shipping_address),carrier=coalesce(nullif(trim(p_carrier),''),f.carrier),tracking_number=coalesce(nullif(trim(p_tracking_number),''),f.tracking_number),label_url=coalesce(nullif(trim(p_label_url),''),f.label_url),label_created_at=case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then now() else f.label_created_at end,status=case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then 'Label Created' else f.status end,notes=coalesce(nullif(trim(p_notes),''),f.notes),updated_by=auth.uid(),updated_at=now() where id=f.id returning * into f;
 else
  insert into public.sales_fulfillments(asset_id,listing_id,fulfilment_reference,status,buyer_name,buyer_email,shipping_address,carrier,tracking_number,label_url,label_created_at,notes,created_by,updated_by) values(p_asset_id,p_listing_id,'FUL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then 'Label Created' else 'Awaiting Shipping' end,nullif(trim(p_buyer_name),''),nullif(trim(p_buyer_email),''),nullif(trim(p_shipping_address),''),nullif(trim(p_carrier),''),nullif(trim(p_tracking_number),''),nullif(trim(p_label_url),''),case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then now() else null end,nullif(trim(p_notes),''),auth.uid(),auth.uid()) returning * into f;
 end if; return f;
end; $$;
revoke all on function public.staff_create_sales_fulfillment(uuid,uuid,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.staff_create_sales_fulfillment(uuid,uuid,text,text,text,text,text,text,text) to authenticated;

create or replace function public.staff_update_sales_fulfillment(p_fulfillment_id uuid,p_action text)
returns public.sales_fulfillments language plpgsql security definer set search_path=public,auth as $$
declare f public.sales_fulfillments%rowtype;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then raise exception 'Active staff access required'; end if;
 select * into f from public.sales_fulfillments where id=p_fulfillment_id for update;if not found then raise exception 'Fulfilment record not found'; end if;
 if p_action='ready_for_collection' then if f.status not in ('Label Created','Ready for Collection') then raise exception 'Create a shipping label first'; end if; update public.sales_fulfillments set status='Ready for Collection',updated_by=auth.uid(),updated_at=now() where id=f.id returning * into f;
 elsif p_action='collected' then if f.status not in ('Label Created','Ready for Collection') then raise exception 'Create a shipping label before marking collected'; end if; update public.sales_fulfillments set status='Collected',collected_at=now(),updated_by=auth.uid(),updated_at=now() where id=f.id returning * into f;
 elsif p_action='delivered' then if f.status <> 'Collected' then raise exception 'Item must be collected before delivery can be recorded'; end if; update public.sales_fulfillments set status='Delivered',delivered_at=now(),updated_by=auth.uid(),updated_at=now() where id=f.id returning * into f;
 else raise exception 'Unknown fulfilment action'; end if; return f;
end; $$;
revoke all on function public.staff_update_sales_fulfillment(uuid,text) from public,anon;
grant execute on function public.staff_update_sales_fulfillment(uuid,text) to authenticated;

create or replace function public.staff_open_sales_customer_return(p_asset_id uuid,p_reason text,p_customer_notes text default null,p_buyer_name text default null,p_buyer_email text default null)
returns public.sales_customer_returns language plpgsql security definer set search_path=public,auth as $$
declare a public.inventory_assets%rowtype; f public.sales_fulfillments%rowtype; r public.sales_customer_returns%rowtype; has_fulfilment boolean:=false;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then raise exception 'Active staff access required'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Return reason is required'; end if;
 select * into a from public.inventory_assets where id=p_asset_id for update;if not found then raise exception 'Inventory asset not found'; end if;if a.status <> 'Sold' then raise exception 'Only a sold item can enter the customer return workflow'; end if;
 if exists(select 1 from public.sales_customer_returns where asset_id=p_asset_id and status not in ('Resolved','Refused','Closed')) then raise exception 'An open customer return already exists for this item'; end if;
 select * into f from public.sales_fulfillments where asset_id=p_asset_id for update;has_fulfilment:=found;if has_fulfilment then update public.sales_fulfillments set status='Return Open',updated_by=auth.uid(),updated_at=now() where id=f.id returning * into f; end if;
 insert into public.sales_customer_returns(return_reference,asset_id,fulfilment_id,status,reason,customer_notes,buyer_name,buyer_email,created_by,updated_by) values('CSR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_asset_id,case when has_fulfilment then f.id else null end,'Requested',trim(p_reason),nullif(trim(p_customer_notes),''),nullif(trim(p_buyer_name),''),nullif(trim(p_buyer_email),''),auth.uid(),auth.uid()) returning * into r;return r;
end; $$;
revoke all on function public.staff_open_sales_customer_return(uuid,text,text,text,text) from public,anon;
grant execute on function public.staff_open_sales_customer_return(uuid,text,text,text,text) to authenticated;

create or replace function public.staff_update_sales_customer_return(p_return_id uuid,p_action text,p_label_url text default null,p_carrier text default null,p_tracking_number text default null,p_refusal_reason text default null,p_staff_notes text default null)
returns public.sales_customer_returns language plpgsql security definer set search_path=public,auth as $$
declare r public.sales_customer_returns%rowtype; a public.inventory_assets%rowtype;
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then raise exception 'Active staff access required'; end if;
 select * into r from public.sales_customer_returns where id=p_return_id for update;if not found then raise exception 'Customer return not found'; end if;
 if p_action='approve' then update public.sales_customer_returns set status='Approved',staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='label' then update public.sales_customer_returns set status='Label Created',label_url=nullif(trim(p_label_url),''),carrier=nullif(trim(p_carrier),''),tracking_number=nullif(trim(p_tracking_number),''),label_created_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='collected' then if r.status <> 'Label Created' then raise exception 'Create the return label first'; end if; update public.sales_customer_returns set status='Collected',collected_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='received' then if r.status not in ('Collected','Label Created') then raise exception 'Return must be in transit before receipt'; end if;select * into a from public.inventory_assets where id=r.asset_id for update;update public.sales_customer_returns set status='Item Received',item_received_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;update public.inventory_assets set status='Returned',previous_status=a.status,status_changed_at=now(),status_change_reason='Post-sale customer return received for review',status_changed_by=auth.uid(),updated_at=now() where id=a.id;if r.fulfilment_id is not null then update public.sales_fulfillments set status='Returned',updated_by=auth.uid(),updated_at=now() where id=r.fulfilment_id;end if;
 elsif p_action='resolve' then update public.sales_customer_returns set status='Resolved',resolved_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 elsif p_action='refuse' then update public.sales_customer_returns set status='Refused',refused_at=now(),refusal_reason=nullif(trim(p_refusal_reason),''),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 else raise exception 'Unknown customer return action'; end if;return r;
end; $$;
revoke all on function public.staff_update_sales_customer_return(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.staff_update_sales_customer_return(uuid,text,text,text,text,text,text) to authenticated;