-- GearCashOut: enforce RECEIVED -> INSPECTION -> FINAL QUOTE -> BANK DETAILS -> PAYMENT/COMPLETED.

create or replace function public.staff_mark_item_received_and_sync_inventory(p_sale_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_sale public.sales%rowtype; v_item record; v_count integer:=0;
begin
 if v_uid is null or not exists(select 1 from public.staff_users where user_id=v_uid) then raise exception 'Staff access required'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.status not in ('shipping','collecting_items','ready_for_shipping') then raise exception 'Sale cannot be marked received from its current status'; end if;
 update public.shipments set status='delivered',delivered_at=coalesce(delivered_at,now()),updated_at=now() where sale_id=p_sale_id and shipment_type='inbound' and status in ('label_created','in_transit');
 update public.sales set status='received',payment_status=case when payment_status='paid' then payment_status else 'awaiting_final_quote' end,updated_at=now() where id=p_sale_id;
 for v_item in select si.quote_item_id from public.sale_items si where si.sale_id=p_sale_id loop
  update public.inventory_assets ia set status='Received',previous_status=ia.status,status_changed_at=now(),status_change_reason='Customer item received',status_changed_by=v_uid,updated_at=now() where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id and ia.status='Awaiting Receipt';
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('sale_id',p_sale_id,'inventory_assets_updated',v_count);
end; $$;

create or replace function public.staff_start_sale_inspection(p_sale_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_sale public.sales%rowtype;
begin
 if v_uid is null or not exists(select 1 from public.staff_users where user_id=v_uid) then raise exception 'Staff access required'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.status<>'received' then raise exception 'The item must be received before inspection can start'; end if;
 update public.sales set status='inspection',payment_status='awaiting_final_quote',updated_at=now() where id=p_sale_id;
 return jsonb_build_object('sale_id',p_sale_id,'status','inspection');
end; $$;
revoke all on function public.staff_start_sale_inspection(uuid) from public,anon;
grant execute on function public.staff_start_sale_inspection(uuid) to authenticated;

create or replace function public.publish_quote_offer(p_item_id uuid,p_offer_type text,p_amount numeric,p_internal_notes text default null,p_customer_message text default null)
returns public.quote_offers language plpgsql security definer set search_path=public as $$
declare v_offer public.quote_offers; v_user uuid:=auth.uid(); v_customer uuid; v_valuation_id uuid; v_sale public.sales%rowtype;
begin
 if not exists(select 1 from public.staff_users where user_id=v_user) then raise exception 'Staff access required'; end if;
 if p_offer_type not in ('automatic','manual','final') then raise exception 'Invalid offer type'; end if;
 if p_amount<0 then raise exception 'Amount cannot be negative'; end if;
 select v.user_id,v.id into v_customer,v_valuation_id from public.quote_items qi join public.valuations v on v.id=qi.valuation_id where qi.id=p_item_id;
 if v_customer is null then raise exception 'Quote item not found'; end if;
 if p_offer_type='final' then
  select s.* into v_sale from public.sales s join public.sale_items si on si.sale_id=s.id where si.quote_item_id=p_item_id order by s.created_at desc limit 1 for update;
  if not found or v_sale.status<>'inspection' then raise exception 'The item must be under inspection before the final quote can be sent'; end if;
 end if;
 update public.quote_offers set status='superseded',updated_at=now() where item_id=p_item_id and status='draft' and offer_type='automatic';
 if p_offer_type='final' then update public.quote_offers set status='withdrawn',updated_at=now() where item_id=p_item_id and status='published'; end if;
 insert into public.quote_offers(item_id,offer_type,amount,status,internal_notes,customer_message,published_at,created_by) values(p_item_id,p_offer_type,p_amount,'published',p_internal_notes,p_customer_message,now(),v_user) returning * into v_offer;
 update public.quote_items set item_status=case when p_offer_type='final' then 'final_offer' else item_status end,updated_at=now() where id=p_item_id;
 if p_offer_type='final' then update public.valuations set status='final_valuation',quote_amount=p_amount,updated_at=now() where id=v_valuation_id; end if;
 insert into public.offer_events(offer_id,event_type,new_amount,note,actor_user_id) values(v_offer.id,'published',p_amount,p_internal_notes,v_user);
 return v_offer;
end; $$;

create or replace function public.accept_quote_offer(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_item public.quote_items%rowtype; v_offer public.quote_offers%rowtype; v_user uuid:=auth.uid(); v_sale public.sales%rowtype; v_sale_item public.sale_items%rowtype; v_total numeric(12,2); v_new_status text; v_payment_status text;
begin
 select qi.* into v_item from public.quote_items qi join public.valuations v on v.id=qi.valuation_id join public.quote_offers qo on qo.item_id=qi.id where qo.id=p_offer_id and v.user_id=v_user;
 select qo.* into v_offer from public.quote_offers qo join public.quote_items qi on qi.id=qo.item_id join public.valuations v on v.id=qi.valuation_id where qo.id=p_offer_id and v.user_id=v_user for update;
 if not found or v_offer.status<>'published' then raise exception 'Offer is not available for acceptance'; end if;
 update public.quote_offers set status='accepted',responded_at=now(),updated_at=now() where id=p_offer_id;
 update public.quote_items set item_status='accepted',updated_at=now() where id=v_offer.item_id;
 update public.quote_offers set status='superseded',updated_at=now() where item_id=v_offer.item_id and id<>p_offer_id and status='published';
 insert into public.offer_events(offer_id,event_type,actor_user_id) values(p_offer_id,'accepted',v_user);
 select * into v_sale from public.sales where user_id=v_user and status not in ('paid','completed','cancelled') order by created_at desc limit 1 for update;
 if not found then
  insert into public.sales(user_id,sale_reference,status,total_amount,accepted_at,payment_status) values(v_user,'GCO-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,6),case when v_offer.offer_type='final' then 'payment_due' else 'collecting_items' end,0,now(),case when v_offer.offer_type='final' then 'awaiting_bank_details' else 'awaiting_final_quote' end) returning * into v_sale;
 else
  v_new_status:=case when v_offer.offer_type='final' then 'payment_due' else v_sale.status end;
  v_payment_status:=case when v_offer.offer_type='final' then 'awaiting_bank_details' else coalesce(v_sale.payment_status,'awaiting_final_quote') end;
  update public.sales set accepted_at=coalesce(accepted_at,now()),status=v_new_status,payment_status=v_payment_status,updated_at=now() where id=v_sale.id returning * into v_sale;
 end if;
 insert into public.sale_items(sale_id,quote_item_id,accepted_offer_id,amount) values(v_sale.id,v_offer.item_id,v_offer.id,v_offer.amount) on conflict(sale_id,quote_item_id) do update set accepted_offer_id=excluded.accepted_offer_id,amount=excluded.amount returning * into v_sale_item;
 if v_offer.offer_type<>'final' and not exists(select 1 from public.shipments where sale_id=v_sale.id and shipment_type='inbound') then insert into public.shipments(sale_id,user_id,shipment_type,status) values(v_sale.id,v_user,'inbound','awaiting_label'); end if;
 select coalesce(sum(amount),0) into v_total from public.sale_items where sale_id=v_sale.id;
 update public.sales set total_amount=v_total,updated_at=now() where id=v_sale.id;
 return jsonb_build_object('sale_id',v_sale.id,'sale_reference',v_sale.sale_reference,'total_amount',v_total,'sale_item_id',v_sale_item.id,'payment_status',(select payment_status from public.sales where id=v_sale.id));
end; $$;

create or replace function public.submit_sale_bank_details(p_sale_id uuid,p_account_name text,p_sort_code text,p_account_number text,p_storage_consent boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype;
begin
 if auth.uid() is null then raise exception 'You must be signed in'; end if;
 if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_sort_code),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Please provide account name, sort code and account number'; end if;
 if regexp_replace(trim(p_sort_code),'[^0-9]','','g') !~ '^\\d{6}$' then raise exception 'Please provide a valid 6 digit sort code'; end if;
 if regexp_replace(trim(p_account_number),'[^0-9]','','g') !~ '^\\d{8}$' then raise exception 'Please provide a valid 8 digit account number'; end if;
 select * into v_sale from public.sales where id=p_sale_id and user_id=auth.uid() for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.status<>'payment_due' then raise exception 'Bank details are requested only after the final quote has been accepted'; end if;
 update public.sales set bank_account_name=trim(p_account_name),bank_sort_code=regexp_replace(trim(p_sort_code),'[^0-9]','','g'),bank_account_number=regexp_replace(trim(p_account_number),'[^0-9]','','g'),bank_details_confirmed_at=now(),bank_details_storage_consent=coalesce(p_storage_consent,false),bank_details_consent_at=case when coalesce(p_storage_consent,false) then now() else null end,bank_details_retention_until=case when coalesce(p_storage_consent,false) then now()+interval '12 months' else null end,bank_details_deleted_at=null,payment_status='bank_details_received',updated_at=now() where id=p_sale_id;
 return jsonb_build_object('sale_id',p_sale_id,'payment_status','bank_details_received','storage_consent',coalesce(p_storage_consent,false));
end; $$;

create or replace function public.staff_mark_sale_paid_and_create_inventory(p_sale_id uuid,p_payment_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_sale public.sales%rowtype; v_item record; v_asset public.inventory_assets%rowtype; v_result jsonb:='[]'::jsonb; v_reference text;
begin
 if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.archived_at is not null then raise exception 'Archived sales cannot be paid from the active workflow'; end if;
 if v_sale.status<>'payment_due' then raise exception 'Payment can only be sent after the final quote has been accepted'; end if;
 if v_sale.bank_details_confirmed_at is null then raise exception 'Customer bank details have not been confirmed'; end if;
 update public.sales set payment_status='paid',payment_sent_at=now(),payment_reference=nullif(trim(p_payment_reference),''),status='completed',updated_at=now() where id=p_sale_id;
 for v_item in select si.quote_item_id,si.amount,qi.manufacturer,qi.model,qi.item_name,qi.package from public.sale_items si join public.quote_items qi on qi.id=si.quote_item_id where si.sale_id=p_sale_id order by si.created_at loop
  if not exists(select 1 from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id) then
   v_reference:='GCO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
   insert into public.inventory_assets(asset_reference,source_sale_id,source_quote_item_id,manufacturer,model,package_name,status,purchase_price,acquired_at,notes) values(v_reference,p_sale_id,v_item.quote_item_id,coalesce(nullif(v_item.manufacturer,''),'Unknown'),coalesce(nullif(v_item.model,''),nullif(v_item.item_name,''),'Unknown item'),nullif(v_item.package,''),'Received',v_item.amount,now(),'Created when seller payment was confirmed. Source sale: '||v_sale.sale_reference) returning * into v_asset;
  else select * into v_asset from public.inventory_assets ia where ia.source_sale_id=p_sale_id and ia.source_quote_item_id=v_item.quote_item_id limit 1; end if;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('inventory_asset_id',v_asset.id,'asset_reference',v_asset.asset_reference));
 end loop;
 if jsonb_array_length(v_result)=0 then raise exception 'Sale has no sale items to create inventory from'; end if;
 return v_result;
end; $$;
