-- GearCashOut: when a logged-in customer already has saved bank details,
-- carry them automatically into a new payment_due sale so the customer is not
-- asked to enter the same details again.

create or replace function public.sync_saved_bank_details_to_payment_due_sale()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_bank public.customer_saved_bank_details%rowtype;
begin
  if new.status = 'payment_due' and new.bank_details_confirmed_at is null then
    select * into v_bank
    from public.customer_saved_bank_details
    where user_id = new.user_id;

    if found then
      update public.sales
      set bank_account_name = v_bank.account_name,
          bank_sort_code = v_bank.sort_code,
          bank_account_number = v_bank.account_number,
          bank_details_confirmed_at = now(),
          bank_details_storage_consent = true,
          bank_details_consent_at = now(),
          bank_details_retention_until = now() + interval '12 months',
          bank_details_deleted_at = null,
          payment_status = 'bank_details_received',
          updated_at = now()
      where id = new.id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_saved_bank_details_to_payment_due_sale() from public, anon;
grant execute on function public.sync_saved_bank_details_to_payment_due_sale() to authenticated;

drop trigger if exists trg_sync_saved_bank_details_to_payment_due_sale on public.sales;
create trigger trg_sync_saved_bank_details_to_payment_due_sale
after insert or update of status, user_id on public.sales
for each row
execute function public.sync_saved_bank_details_to_payment_due_sale();

-- Repair any current payment_due sale where the customer had already saved
-- bank details before the sale was created.
update public.sales s
set bank_account_name = b.account_name,
    bank_sort_code = b.sort_code,
    bank_account_number = b.account_number,
    bank_details_confirmed_at = coalesce(s.bank_details_confirmed_at, now()),
    bank_details_storage_consent = true,
    bank_details_consent_at = coalesce(s.bank_details_consent_at, now()),
    bank_details_retention_until = coalesce(s.bank_details_retention_until, now() + interval '12 months'),
    bank_details_deleted_at = null,
    payment_status = 'bank_details_received',
    updated_at = now()
from public.customer_saved_bank_details b
where b.user_id = s.user_id
  and s.status = 'payment_due'
  and s.bank_details_confirmed_at is null;
