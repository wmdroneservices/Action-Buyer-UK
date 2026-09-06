CREATE OR REPLACE FUNCTION public.staff_update_sales_customer_return(p_return_id uuid, p_action text, p_label_url text DEFAULT NULL::text, p_carrier text DEFAULT NULL::text, p_tracking_number text DEFAULT NULL::text, p_refusal_reason text DEFAULT NULL::text, p_staff_notes text DEFAULT NULL::text)
 RETURNS sales_customer_returns
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
  update public.sales_customer_returns set status='Resolved',resolved_at=now(),staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
  if r.fulfilment_id is not null and r.item_received_at is null then
    update public.sales_fulfillments set status='Delivered',updated_by=auth.uid(),updated_at=now() where id=r.fulfilment_id;
  end if;
 elsif p_action='refuse' then
  update public.sales_customer_returns set status='Refused',refused_at=now(),refusal_reason=nullif(trim(p_refusal_reason),''),staff_notes=coalesce(nullif(trim(p_staff_notes),''),staff_notes),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
  if r.fulfilment_id is not null and r.item_received_at is null then
    update public.sales_fulfillments set status='Delivered',updated_by=auth.uid(),updated_at=now() where id=r.fulfilment_id;
  end if;
 else raise exception 'Unknown customer return action'; end if;
 return r;
end; $function$
