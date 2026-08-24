create policy "Customers can post their inbound shipment"
on public.shipments
for update
to public
using (
  user_id = auth.uid()
  and shipment_type = 'inbound'
  and status = 'label_created'
)
with check (
  user_id = auth.uid()
  and shipment_type = 'inbound'
  and status = 'in_transit'
  and shipped_at is not null
);

create policy "Customers can move their sale to shipping"
on public.sales
for update
to public
using (
  user_id = auth.uid()
  and status in ('collecting_items', 'ready_for_shipping', 'shipping')
)
with check (
  user_id = auth.uid()
  and status = 'shipping'
);
