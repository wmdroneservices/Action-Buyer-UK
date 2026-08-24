-- GearCashOut: payment_status needs an internal state while the customer item is awaiting inspection/final quote.
-- Bank details are still NOT requested from the customer until sales.status = payment_due.

alter table public.sales drop constraint if exists sales_payment_status_check;

alter table public.sales
  add constraint sales_payment_status_check
  check (payment_status in (
    'awaiting_final_quote',
    'awaiting_bank_details',
    'bank_details_received',
    'payment_processing',
    'payment_sent',
    'paid'
  ));
