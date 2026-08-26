create table if not exists public.customer_saved_bank_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_name text not null,
  sort_code text not null,
  account_number text not null,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_saved_bank_details enable row level security;
drop policy if exists customer_saved_bank_details_select_own on public.customer_saved_bank_details;
create policy customer_saved_bank_details_select_own on public.customer_saved_bank_details for select to authenticated using (user_id = auth.uid());
drop policy if exists customer_saved_bank_details_insert_own on public.customer_saved_bank_details;
create policy customer_saved_bank_details_insert_own on public.customer_saved_bank_details for insert to authenticated with check (user_id = auth.uid());
drop policy if exists customer_saved_bank_details_update_own on public.customer_saved_bank_details;
create policy customer_saved_bank_details_update_own on public.customer_saved_bank_details for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists customer_saved_bank_details_delete_own on public.customer_saved_bank_details;
create policy customer_saved_bank_details_delete_own on public.customer_saved_bank_details for delete to authenticated using (user_id = auth.uid());

create or replace function public.get_saved_customer_bank_details()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.customer_saved_bank_details%rowtype;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  select * into v_row from public.customer_saved_bank_details where user_id=auth.uid();
  if not found then return null; end if;
  return jsonb_build_object('account_name',v_row.account_name,'sort_code',v_row.sort_code,'account_number',v_row.account_number,'saved_at',v_row.saved_at,'updated_at',v_row.updated_at);
end;
$$;
revoke all on function public.get_saved_customer_bank_details() from public,anon;
grant execute on function public.get_saved_customer_bank_details() to authenticated;

create or replace function public.delete_saved_customer_bank_details()
returns jsonb language sql security definer set search_path=public as $$
delete from public.customer_saved_bank_details where user_id=auth.uid();
select jsonb_build_object('deleted',true);
$$;
revoke all on function public.delete_saved_customer_bank_details() from public,anon;
grant execute on function public.delete_saved_customer_bank_details() to authenticated;

create or replace function public.submit_sale_bank_details(p_sale_id uuid,p_account_name text,p_sort_code text,p_account_number text,p_storage_consent boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype;
begin
 if auth.uid() is null then raise exception 'You must be signed in'; end if;
 if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_sort_code),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Please provide account name, sort code and account number'; end if;
 if regexp_replace(trim(p_sort_code),'[^0-9]','','g') !~ '^[0-9]{6}$' then raise exception 'Please provide a valid 6 digit sort code'; end if;
 if regexp_replace(trim(p_account_number),'[^0-9]','','g') !~ '^[0-9]{8}$' then raise exception 'Please provide a valid 8 digit account number'; end if;
 select * into v_sale from public.sales where id=p_sale_id and user_id=auth.uid() for update;
 if not found then raise exception 'Sale not found'; end if;
 if v_sale.status<>'payment_due' then raise exception 'Bank details are requested only after the final quote has been accepted'; end if;
 update public.sales set bank_account_name=trim(p_account_name),bank_sort_code=regexp_replace(trim(p_sort_code),'[^0-9]','','g'),bank_account_number=regexp_replace(trim(p_account_number),'[^0-9]','','g'),bank_details_confirmed_at=now(),bank_details_storage_consent=coalesce(p_storage_consent,false),bank_details_consent_at=case when coalesce(p_storage_consent,false) then now() else null end,bank_details_retention_until=case when coalesce(p_storage_consent,false) then now()+interval '12 months' else null end,bank_details_deleted_at=null,payment_status='bank_details_received',updated_at=now() where id=p_sale_id;
 if coalesce(p_storage_consent,false) then
   insert into public.customer_saved_bank_details(user_id,account_name,sort_code,account_number,saved_at,updated_at)
   values(auth.uid(),trim(p_account_name),regexp_replace(trim(p_sort_code),'[^0-9]','','g'),regexp_replace(trim(p_account_number),'[^0-9]','','g'),now(),now())
   on conflict(user_id) do update set account_name=excluded.account_name,sort_code=excluded.sort_code,account_number=excluded.account_number,updated_at=now();
 end if;
 return jsonb_build_object('sale_id',p_sale_id,'payment_status','bank_details_received','storage_consent',coalesce(p_storage_consent,false));
end;
$$;
revoke all on function public.submit_sale_bank_details(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.submit_sale_bank_details(uuid,text,text,text,boolean) to authenticated;
