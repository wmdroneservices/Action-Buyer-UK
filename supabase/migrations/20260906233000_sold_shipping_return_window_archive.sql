begin;

alter table public.inventory_assets
  add column if not exists return_window_ends_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_tax_year text;

alter table public.inventory_assets drop constraint if exists inventory_assets_status_check;
alter table public.inventory_assets add constraint inventory_assets_status_check check (
  status = any (array[
    'Awaiting Receipt','Received','Inspection Required','Testing','Repair Required',
    'Ready for Resale','Sent to Sales','Listed','Reserved',
    'Sold','Sold - Awaiting Shipping','Sold - Shipped',
    'Returned','Dispatched','Completed','Archived','Held','Written Off'
  ])
);

CREATE OR REPLACE FUNCTION public.gco_uk_tax_year(p_at timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_at is null then null
    when extract(month from p_at at time zone 'Europe/London') > 4
      or (extract(month from p_at at time zone 'Europe/London') = 4 and extract(day from p_at at time zone 'Europe/London') >= 6)
    then extract(year from p_at at time zone 'Europe/London')::int::text || '/' || right((extract(year from p_at at time zone 'Europe/London')::int + 1)::text,2)
    else (extract(year from p_at at time zone 'Europe/London')::int - 1)::text || '/' || right(extract(year from p_at at time zone 'Europe/London')::int::text,2)
  end;
$function$

CREATE OR REPLACE FUNCTION public.staff_mark_resale_listing_sold(p_listing_id uuid, p_sold_price numeric, p_selling_fees numeric DEFAULT 0, p_shipping_cost numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  l public.resale_listings%rowtype;
  a public.inventory_assets%rowtype;
  result jsonb;
  v_outlet_name text;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid() and active=true) then
    raise exception 'Active staff access required';
  end if;
  if p_sold_price is null or p_sold_price<0 then
    raise exception 'Sold price must be zero or greater';
  end if;

  select * into l from public.resale_listings where id=p_listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  select * into a from public.inventory_assets where id=l.asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;

  if l.status='Sold' then
    return jsonb_build_object('listing_id',l.id,'asset_id',a.id,'status',a.status);
  end if;
  if l.status not in ('Published','Reserved') then
    raise exception 'Only a published or reserved listing can be marked sold';
  end if;
  if a.status not in ('Sent to Sales','Listed','Reserved') then
    raise exception 'Asset is not currently in the Sales workflow';
  end if;

  select outlet_name into v_outlet_name from public.sales_outlets where id=l.outlet_id;

  update public.resale_listings
    set status='Sold',
        sold_price=p_sold_price,
        selling_fees=coalesce(p_selling_fees,0),
        shipping_cost=coalesce(p_shipping_cost,0),
        sold_at=now(),
        updated_at=now()
    where id=l.id;

  update public.resale_listings
    set status='Delist Required',updated_at=now()
    where asset_id=a.id and id<>l.id
      and status in ('Draft','Ready For Listing','Published','Reserved','Delist Required');

  update public.inventory_assets
    set status='Sold - Awaiting Shipping',
        previous_status=a.status,
        status_changed_at=now(),
        status_change_reason='Product sold through outlet and requires shipping: '||coalesce(v_outlet_name,l.sales_channel),
        status_changed_by=auth.uid(),
        sold_at=now(),
        sold_price=p_sold_price,
        sold_channel=coalesce(v_outlet_name,l.sales_channel),
        sold_listing_id=l.id,
        return_window_ends_at=null,
        archived_at=null,
        archive_tax_year=null,
        updated_at=now()
    where id=a.id
    returning * into a;

  result:=jsonb_build_object(
    'listing_id',l.id,'asset_id',a.id,'sku',a.sku,'status',a.status,
    'sold_price',p_sold_price,'sales_channel',l.sales_channel,
    'outlet_id',l.outlet_id,'outlet_name',coalesce(v_outlet_name,l.sales_channel)
  );
  return result;
end;
$function$

CREATE OR REPLACE FUNCTION public.staff_create_sales_fulfillment(p_asset_id uuid, p_listing_id uuid DEFAULT NULL::uuid, p_buyer_name text DEFAULT NULL::text, p_buyer_email text DEFAULT NULL::text, p_shipping_address text DEFAULT NULL::text, p_carrier text DEFAULT NULL::text, p_tracking_number text DEFAULT NULL::text, p_label_url text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS sales_fulfillments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  a public.inventory_assets%rowtype;
  f public.sales_fulfillments%rowtype;
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;

  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status not in ('Sold','Sold - Awaiting Shipping') then
    raise exception 'Only a sold item requiring shipping can enter post-sale fulfilment';
  end if;

  if a.status='Sold' then
    update public.inventory_assets
      set status='Sold - Awaiting Shipping',
          previous_status='Sold',
          status_changed_at=now(),
          status_change_reason='Legacy sold item entered shipping workflow',
          status_changed_by=auth.uid(),
          updated_at=now()
      where id=a.id
      returning * into a;
  end if;

  select * into f from public.sales_fulfillments where asset_id=p_asset_id for update;
  if found then
    if f.status in ('Delivered','Return Open','Returned','Closed') then
      raise exception 'This fulfilment can no longer be replaced by a new shipping label';
    end if;

    update public.sales_fulfillments set
      listing_id=coalesce(p_listing_id,f.listing_id),
      buyer_name=coalesce(nullif(trim(p_buyer_name),''),f.buyer_name),
      buyer_email=coalesce(nullif(trim(p_buyer_email),''),f.buyer_email),
      shipping_address=coalesce(nullif(trim(p_shipping_address),''),f.shipping_address),
      carrier=coalesce(nullif(trim(p_carrier),''),f.carrier),
      tracking_number=coalesce(nullif(trim(p_tracking_number),''),f.tracking_number),
      label_url=coalesce(nullif(trim(p_label_url),''),f.label_url),
      label_created_at=case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then now() else f.label_created_at end,
      status=case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then 'Label Created' else f.status end,
      notes=coalesce(nullif(trim(p_notes),''),f.notes),
      updated_by=auth.uid(),
      updated_at=now()
    where id=f.id returning * into f;
  else
    insert into public.sales_fulfillments(
      asset_id,listing_id,fulfilment_reference,status,buyer_name,buyer_email,
      shipping_address,carrier,tracking_number,label_url,label_created_at,
      notes,created_by,updated_by
    ) values (
      p_asset_id,p_listing_id,'FUL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
      case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then 'Label Created' else 'Awaiting Shipping' end,
      nullif(trim(p_buyer_name),''),nullif(trim(p_buyer_email),''),
      nullif(trim(p_shipping_address),''),nullif(trim(p_carrier),''),
      nullif(trim(p_tracking_number),''),nullif(trim(p_label_url),''),
      case when nullif(trim(p_label_url),'') is not null or nullif(trim(p_tracking_number),'') is not null then now() else null end,
      nullif(trim(p_notes),''),auth.uid(),auth.uid()
    ) returning * into f;
  end if;
  return f;
end;
$function$

CREATE OR REPLACE FUNCTION public.staff_update_sales_fulfillment(p_fulfillment_id uuid, p_action text)
 RETURNS sales_fulfillments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  f public.sales_fulfillments%rowtype;
  a public.inventory_assets%rowtype;
  v_now timestamptz := now();
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;

  select * into f from public.sales_fulfillments where id=p_fulfillment_id for update;
  if not found then raise exception 'Fulfilment record not found'; end if;
  select * into a from public.inventory_assets where id=f.asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;

  if p_action='ready_for_collection' then
    if f.status not in ('Label Created','Ready for Collection') then raise exception 'Create a shipping label first'; end if;
    update public.sales_fulfillments set status='Ready for Collection',updated_by=auth.uid(),updated_at=v_now where id=f.id returning * into f;

  elsif p_action='collected' then
    if f.status not in ('Label Created','Ready for Collection') then raise exception 'Create a shipping label before marking collected'; end if;
    update public.sales_fulfillments set status='Collected',collected_at=v_now,updated_by=auth.uid(),updated_at=v_now where id=f.id returning * into f;
    update public.inventory_assets set
      status='Sold - Shipped',
      previous_status=a.status,
      status_changed_at=v_now,
      status_change_reason='Sold item collected by carrier',
      status_changed_by=auth.uid(),
      updated_at=v_now
    where id=a.id;

  elsif p_action='delivered' then
    if f.status <> 'Collected' then raise exception 'Item must be collected before delivery can be recorded'; end if;
    update public.sales_fulfillments set status='Delivered',delivered_at=v_now,updated_by=auth.uid(),updated_at=v_now where id=f.id returning * into f;
    update public.inventory_assets set
      status='Sold - Shipped',
      previous_status=a.status,
      status_changed_at=v_now,
      status_change_reason='Delivered — retained in post-sale return window',
      status_changed_by=auth.uid(),
      return_window_ends_at=v_now + interval '30 days',
      updated_at=v_now
    where id=a.id;

  else
    raise exception 'Unknown fulfilment action';
  end if;
  return f;
end;
$function$

CREATE OR REPLACE FUNCTION public.staff_open_sales_customer_return(p_asset_id uuid, p_reason text, p_customer_notes text DEFAULT NULL::text, p_buyer_name text DEFAULT NULL::text, p_buyer_email text DEFAULT NULL::text)
 RETURNS sales_customer_returns
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  a public.inventory_assets%rowtype;
  f public.sales_fulfillments%rowtype;
  r public.sales_customer_returns%rowtype;
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Return reason is required'; end if;

  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status <> 'Sold - Shipped' then raise exception 'Only a shipped sold item can enter the customer return workflow'; end if;
  if exists(select 1 from public.sales_customer_returns where asset_id=p_asset_id and status not in ('Resolved','Refused','Closed')) then
    raise exception 'An open customer return already exists for this item';
  end if;

  select * into f from public.sales_fulfillments where asset_id=p_asset_id for update;
  if not found or f.status <> 'Delivered' then
    raise exception 'A customer return can only be opened after delivery is recorded';
  end if;

  update public.sales_fulfillments
    set status='Return Open',updated_by=auth.uid(),updated_at=now()
    where id=f.id returning * into f;

  insert into public.sales_customer_returns(
    return_reference,asset_id,fulfilment_id,status,reason,customer_notes,
    buyer_name,buyer_email,created_by,updated_by
  ) values (
    'CSR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    p_asset_id,f.id,'Requested',trim(p_reason),nullif(trim(p_customer_notes),''),
    nullif(trim(p_buyer_name),''),nullif(trim(p_buyer_email),''),auth.uid(),auth.uid()
  ) returning * into r;

  return r;
end;
$function$

CREATE OR REPLACE FUNCTION public.staff_archive_sales_asset(p_asset_id uuid)
 RETURNS inventory_assets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  a public.inventory_assets%rowtype;
  f public.sales_fulfillments%rowtype;
begin
  if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and coalesce(s.active,true)=true) then
    raise exception 'Active staff access required';
  end if;

  select * into a from public.inventory_assets where id=p_asset_id for update;
  if not found then raise exception 'Inventory asset not found'; end if;
  if a.status <> 'Sold - Shipped' then raise exception 'Only shipped sold items can be archived'; end if;

  select * into f from public.sales_fulfillments where asset_id=a.id for update;
  if not found or f.status <> 'Delivered' then raise exception 'Delivery must be recorded before archiving'; end if;
  if a.return_window_ends_at is null or now() < a.return_window_ends_at then
    raise exception 'Return holding period has not yet ended';
  end if;
  if exists(select 1 from public.sales_customer_returns where asset_id=a.id and status not in ('Resolved','Refused','Closed')) then
    raise exception 'An open customer return prevents archiving';
  end if;

  update public.inventory_assets set
    status='Archived',
    previous_status=a.status,
    status_changed_at=now(),
    status_change_reason='Post-sale return window complete — archived for accounting and research',
    status_changed_by=auth.uid(),
    archived_at=now(),
    archive_tax_year=public.gco_uk_tax_year(coalesce(sold_at,now())),
    updated_at=now()
  where id=a.id
  returning * into a;

  return a;
end;
$function$

commit;
