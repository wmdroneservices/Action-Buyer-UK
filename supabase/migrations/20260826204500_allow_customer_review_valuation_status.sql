-- Combined quotations use customer_review as the valuation-level state after one
-- combined offer has been sent. The existing check constraint pre-dated that state
-- and caused queue_quote_review_email() to fail before the email could be sent.

alter table public.valuations drop constraint if exists valuations_status_check;

alter table public.valuations add constraint valuations_status_check
check (status = any (array[
  'submitted'::text,
  'manual_review'::text,
  'valued'::text,
  'customer_review'::text,
  'accepted'::text,
  'awaiting_equipment'::text,
  'received'::text,
  'inspection'::text,
  'final_valuation'::text,
  'payment_processing'::text,
  'paid'::text,
  'cancelled'::text
]));
