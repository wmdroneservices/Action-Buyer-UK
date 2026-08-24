create or replace function public.normalise_inbound_label_state()
returns trigger
language plpgsql
as $$
begin
  if new.shipment_type = 'inbound' and new.status in ('awaiting_label','label_created') then
    new.shipped_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalise_inbound_label_state on public.shipments;
create trigger trg_normalise_inbound_label_state
before insert or update of shipment_type, status, shipped_at on public.shipments
for each row
execute function public.normalise_inbound_label_state();

update public.shipments
set shipped_at = null
where shipment_type = 'inbound'
  and status in ('awaiting_label','label_created')
  and shipped_at is not null;
