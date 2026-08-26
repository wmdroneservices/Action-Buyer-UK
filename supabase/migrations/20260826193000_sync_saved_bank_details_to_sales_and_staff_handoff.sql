create or replace function public.save_customer_bank_details(p_account_name text,p_sort_code text,p_account_number text,p_storage_consent boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sort text; v_account text;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_sort_code),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Please provide account name, sort code and account number'; end if;
  v_sort:=regexp_replace(trim(p_sort_code),'[^0-9]','','g');
  v_account:=regexp_replace(trim(p_account_number),'[^0-9]','','g');
  if v_sort !~ '^[0-9]{6}$' then raise exception 'Please provide a valid 6 digit sort code'; end if;
  if v_account !~ '^[0-9]{8}$' then raise exception 'Please provide a valid 8 digit account number'; end if;
  if not coalesce(p_storage_consent,false) then raise exception 'Please confirm that you want GearCashOut to retain these bank details for future payments'; end if;
  insert into public.customer_saved_bank_details(user_id,account_name,sort_code,account_number,saved_at,updated_at)
  values(auth.uid(),trim(p_account_name),v_sort,v_account,now(),now())
  on conflict(user_id) do update set account_name=excluded.account_name,sort_code=excluded.sort_code,account_number=excluded.account_number,updated_at=now();
  update public.sales set bank_account_name=trim(p_account_name),bank_sort_code=v_sort,bank_account_number=v_account,bank_details_confirmed_at=now(),bank_details_storage_consent=true,bank_details_consent_at=now(),bank_details_retention_until=now()+interval '12 months',bank_details_deleted_at=null,payment_status='bank_details_received',updated_at=now()
  where user_id=auth.uid() and status='payment_due' and payment_sent_at is null;
  return jsonb_build_object('saved',true);
end;
$$;

create or replace function public.staff_get_customer_saved_bank_details(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.customer_saved_bank_details%rowtype;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  select * into v_row from public.customer_saved_bank_details where user_id=p_user_id;
  if not found then return null; end if;
  return jsonb_build_object('account_name',v_row.account_name,'sort_code',v_row.sort_code,'account_number',v_row.account_number,'saved_at',v_row.saved_at,'updated_at',v_row.updated_at);
end;
$$;
revoke all on function public.staff_get_customer_saved_bank_details(uuid) from public,anon;
grant execute on function public.staff_get_customer_saved_bank_details(uuid) to authenticated;

create or replace function public.staff_set_sale_bank_details(p_sale_id uuid,p_account_name text,p_sort_code text,p_account_number text,p_storage_consent boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sort text; v_account text; v_user uuid; v_status text;
begin
  if not exists(select 1 from public.staff_users where user_id=auth.uid()) then raise exception 'Staff access required'; end if;
  if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_sort_code),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Please provide account name, sort code and account number'; end if;
  v_sort:=regexp_replace(trim(p_sort_code),'[^0-9]','','g');
  v_account:=regexp_replace(trim(p_account_number),'[^0-9]','','g');
  if v_sort !~ '^[0-9]{6}$' then raise exception 'Please provide a valid 6 digit sort code'; end if;
  if v_account !~ '^[0-9]{8}$' then raise exception 'Please provide a valid 8 digit account number'; end if;
  select user_id,status into v_user,v_status from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_status not in ('payment_due','paid','completed') then raise exception 'Bank details cannot be attached at this stage'; end if;
  update public.sales set bank_account_name=trim(p_account_name),bank_sort_code=v_sort,bank_account_number=v_account,bank_details_confirmed_at=now(),bank_details_storage_consent=coalesce(p_storage_consent,false),bank_details_consent_at=case when coalesce(p_storage_consent,false) then now() else null end,bank_details_retention_until=case when coalesce(p_storage_consent,false) then now()+interval '12 months' else null end,bank_details_deleted_at=null,payment_status=case when v_status='payment_due' then 'bank_details_received' else payment_status end,updated_at=now() where id=p_sale_id;
  return jsonb_build_object('sale_id',p_sale_id,'customer_id',v_user,'payment_status','bank_details_received');
end;
$$;
revoke all on function public.staff_set_sale_bank_details(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.staff_set_sale_bank_details(uuid,text,text,text,boolean) to authenticated;

-- Backfill active payment-due sales from customer-saved bank details when those details were added after the sale was created.
update public.sales s set bank_account_name=b.account_name,bank_sort_code=b.sort_code,bank_account_number=b.account_number,bank_details_confirmed_at=coalesce(s.bank_details_confirmed_at,now()),bank_details_storage_consent=true,bank_details_consent_at=coalesce(s.bank_details_consent_at,now()),bank_details_retention_until=coalesce(s.bank_details_retention_until,now()+interval '12 months'),bank_details_deleted_at=null,payment_status='bank_details_received',updated_at=now()
from public.customer_saved_bank_details b
where b.user_id=s.user_id and s.status='payment_due' and s.payment_sent_at is null and (s.bank_account_number is null or s.bank_details_confirmed_at is null);
