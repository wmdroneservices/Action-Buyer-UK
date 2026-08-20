alter table public.sales add column if not exists bank_details_consent_withdrawn_at timestamptz;

create or replace function public.withdraw_bank_details_consent()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  update public.sales set
    bank_details_storage_consent=false,
    bank_details_consent_withdrawn_at=now(),
    bank_account_name=null,
    bank_sort_code=null,
    bank_account_number=null,
    bank_details_deleted_at=now(),
    bank_details_retention_until=null,
    updated_at=now()
  where user_id=auth.uid() and bank_details_storage_consent=true and bank_account_number is not null;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.withdraw_bank_details_consent() from public,anon;
grant execute on function public.withdraw_bank_details_consent() to authenticated;
