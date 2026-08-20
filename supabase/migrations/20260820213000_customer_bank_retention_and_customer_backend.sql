alter table public.sales
  add column if not exists bank_details_storage_consent boolean not null default false,
  add column if not exists bank_details_consent_at timestamptz,
  add column if not exists bank_details_retention_until timestamptz,
  add column if not exists bank_details_deleted_at timestamptz;

drop function if exists public.submit_sale_bank_details(uuid,text,text,text);
create or replace function public.submit_sale_bank_details(
  p_sale_id uuid,
  p_account_name text,
  p_sort_code text,
  p_account_number text,
  p_storage_consent boolean default false
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_sort_code),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Please provide account name, sort code and account number'; end if;
  if regexp_replace(trim(p_sort_code),'[^0-9]','','g') !~ '^\d{6}$' then raise exception 'Please provide a valid 6 digit sort code'; end if;
  if regexp_replace(trim(p_account_number),'[^0-9]','','g') !~ '^\d{8}$' then raise exception 'Please provide a valid 8 digit account number'; end if;
  select * into v_sale from public.sales where id=p_sale_id and user_id=auth.uid() for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.status in ('paid','completed','cancelled') then raise exception 'Bank details can no longer be changed for this sale'; end if;
  update public.sales set
    bank_account_name=trim(p_account_name),
    bank_sort_code=regexp_replace(trim(p_sort_code),'[^0-9]','','g'),
    bank_account_number=regexp_replace(trim(p_account_number),'[^0-9]','','g'),
    bank_details_confirmed_at=now(),
    bank_details_storage_consent=coalesce(p_storage_consent,false),
    bank_details_consent_at=case when coalesce(p_storage_consent,false) then now() else null end,
    bank_details_retention_until=case when coalesce(p_storage_consent,false) then now()+interval '12 months' else null end,
    bank_details_deleted_at=null,
    payment_status='bank_details_received',
    updated_at=now()
  where id=p_sale_id;
  return jsonb_build_object('sale_id',p_sale_id,'payment_status','bank_details_received','storage_consent',coalesce(p_storage_consent,false));
end;
$$;
revoke all on function public.submit_sale_bank_details(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.submit_sale_bank_details(uuid,text,text,text,boolean) to authenticated;

create or replace function public.purge_expired_bank_details()
returns integer language plpgsql security definer set search_path=public as $$
declare v_old integer:=0; v_consented integer:=0;
begin
  update public.sales set bank_account_name=null,bank_sort_code=null,bank_account_number=null,bank_details_deleted_at=now(),bank_details_retention_until=null,updated_at=now()
  where bank_account_number is not null and bank_details_storage_consent=false and payment_sent_at is not null and payment_sent_at <= now()-interval '7 days' and status in ('paid','completed');
  get diagnostics v_old=row_count;
  update public.sales set bank_account_name=null,bank_sort_code=null,bank_account_number=null,bank_details_deleted_at=now(),bank_details_retention_until=null,updated_at=now()
  where bank_account_number is not null and bank_details_storage_consent=true and bank_details_retention_until is not null and bank_details_retention_until <= now();
  get diagnostics v_consented=row_count;
  return v_old+v_consented;
end;
$$;
revoke all on function public.purge_expired_bank_details() from public,anon,authenticated;

do $$ begin create extension if not exists pg_cron with schema pg_catalog; exception when others then raise notice 'pg_cron could not be enabled automatically: %',sqlerrm; end $$;
do $$ begin if to_regclass('cron.job') is not null and not exists(select 1 from cron.job where jobname='purge-expired-bank-details') then perform cron.schedule('purge-expired-bank-details','15 3 * * *','select public.purge_expired_bank_details();'); end if; exception when others then raise notice 'Bank details cron schedule could not be created automatically: %',sqlerrm; end $$;

create or replace function public.staff_customer_profile(p_user_id uuid)
returns jsonb language sql security definer set search_path=public as $$
with customer as (
 select jsonb_build_object('user_id',u.id,'account_number',p.account_number,'email',u.email,'full_name',p.full_name,'phone',p.phone,'address_line1',p.address_line1,'address_line2',p.address_line2,'city',p.city,'county',p.county,'postcode',p.postcode,'account_status',coalesce(p.account_status,'active'),'closed_at',p.closed_at) data
 from auth.users u left join public.profiles p on p.id=u.id
 where u.id=p_user_id and exists(select 1 from public.staff_users s where s.user_id=auth.uid()) and not exists(select 1 from public.staff_users s2 where s2.user_id=u.id)
), vals as (
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'quote_reference',v.quote_reference,'status',v.status,'quote_amount',v.quote_amount,'submitted_at',v.submitted_at,'archived_at',v.archived_at,'items',coalesce((select jsonb_agg(jsonb_build_object('id',qi.id,'item_name',qi.item_name,'manufacturer',qi.manufacturer,'model',qi.model,'package',qi.package,'item_status',qi.item_status,'item_position',qi.item_position,'offers',coalesce((select jsonb_agg(jsonb_build_object('id',qo.id,'amount',qo.amount,'status',qo.status,'published_at',qo.published_at,'responded_at',qo.responded_at,'internal_notes',qo.internal_notes) order by qo.created_at desc) from public.quote_offers qo where qo.item_id=qi.id),'[]'::jsonb),'refusals',coalesce((select jsonb_agg(jsonb_build_object('reason',qr.reason,'refused_at',qr.refused_at) order by qr.refused_at desc) from public.quote_item_refusals qr where qr.item_id=qi.id),'[]'::jsonb)) order by qi.item_position nulls last,qi.created_at) from public.quote_items qi where qi.valuation_id=v.id),'[]'::jsonb)) order by v.submitted_at desc),'[]'::jsonb) data
 from public.valuations v where v.user_id=p_user_id
), sales_data as (
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'sale_reference',s.sale_reference,'status',s.status,'total_amount',s.total_amount,'created_at',s.created_at,'accepted_at',s.accepted_at,'payment_status',s.payment_status,'payment_sent_at',s.payment_sent_at,'payment_reference',s.payment_reference,'archived_at',s.archived_at,'archive_folder',s.archive_folder,'bank_details_confirmed_at',s.bank_details_confirmed_at,'bank_details_storage_consent',s.bank_details_storage_consent,'bank_details_deleted_at',s.bank_details_deleted_at,'bank_account_masked',case when s.bank_account_number is not null then 'XXXX'||right(s.bank_account_number,4) else null end,'bank_sort_code_masked',case when s.bank_sort_code is not null then 'XX-XX-'||right(s.bank_sort_code,2) else null end,'items',coalesce((select jsonb_agg(jsonb_build_object('amount',si.amount,'item_name',coalesce(qi.item_name,qi.model,'Item'),'manufacturer',qi.manufacturer,'model',qi.model) order by si.created_at) from public.sale_items si left join public.quote_items qi on qi.id=si.quote_item_id where si.sale_id=s.id),'[]'::jsonb),'shipments',coalesce((select jsonb_agg(jsonb_build_object('shipment_type',sh.shipment_type,'status',sh.status,'carrier',sh.carrier,'tracking_number',sh.tracking_number,'shipped_at',sh.shipped_at,'delivered_at',sh.delivered_at) order by sh.created_at desc) from public.shipments sh where sh.sale_id=s.id),'[]'::jsonb)) order by s.created_at desc),'[]'::jsonb) data
 from public.sales s where s.user_id=p_user_id
)
select jsonb_build_object('customer',(select data from customer),'valuations',(select data from vals),'sales',(select data from sales_data));
$$;
revoke all on function public.staff_customer_profile(uuid) from public,anon;
grant execute on function public.staff_customer_profile(uuid) to authenticated;

revoke execute on function public.save_customer_bank_details(uuid,text,text,text) from anon;
