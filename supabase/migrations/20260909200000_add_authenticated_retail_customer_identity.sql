alter table public.resale_transactions
  add column if not exists buyer_user_id uuid references auth.users(id);

create index if not exists resale_transactions_buyer_user_id_idx
  on public.resale_transactions(buyer_user_id, sale_date desc);

create or replace function public.customer_retail_purchase_history()
returns jsonb
language sql
security definer
set search_path = public
as $function$
select coalesce(jsonb_agg(row_data order by sale_date desc), '[]'::jsonb)
from (
  select jsonb_build_object(
    'id', rt.id,
    'sale_date', rt.sale_date,
    'status', rt.status,
    'sale_price', rt.sale_price,
    'additional_costs', rt.additional_costs,
    'sales_channel', rt.sales_channel,
    'invoice_reference', rt.invoice_reference,
    'handover_completed_at', rt.handover_completed_at,
    'asset_sku', ia.sku,
    'manufacturer', ia.manufacturer,
    'model', ia.model,
    'listing_title', rl.listing_title,
    'listing_reference', rl.listing_reference,
    'listing_url', rl.listing_url,
    'fulfilment', (
      select jsonb_build_object(
        'status', sf.status,
        'carrier', sf.carrier,
        'tracking_number', sf.tracking_number,
        'label_created_at', sf.label_created_at,
        'collected_at', sf.collected_at,
        'delivered_at', sf.delivered_at
      )
      from public.sales_fulfillments sf
      where sf.asset_id = rt.asset_id
        and (rt.listing_id is null or sf.listing_id = rt.listing_id)
      order by sf.created_at desc
      limit 1
    ),
    'return_case', (
      select jsonb_build_object(
        'status', scr.status,
        'reason', scr.reason,
        'customer_notes', scr.customer_notes,
        'created_at', scr.created_at,
        'resolved_at', scr.resolved_at,
        'refused_at', scr.refused_at,
        'refusal_reason', scr.refusal_reason,
        'resolution_summary', scr.resolution_summary,
        'refund_amount', scr.refund_amount,
        'refund_reference', scr.refund_reference,
        'replacement_reference', scr.replacement_reference
      )
      from public.sales_customer_returns scr
      where scr.asset_id = rt.asset_id
      order by scr.created_at desc
      limit 1
    )
  ) as row_data,
  rt.sale_date
  from public.resale_transactions rt
  left join public.inventory_assets ia on ia.id = rt.asset_id
  left join public.resale_listings rl on rl.id = rt.listing_id
  where rt.buyer_user_id = auth.uid()
) q;
$function$;

revoke all on function public.customer_retail_purchase_history() from public;
grant execute on function public.customer_retail_purchase_history() to authenticated;

create or replace function public.staff_customer_profile(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $function$
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
), retail_data as (
 select coalesce(jsonb_agg(jsonb_build_object('id',rt.id,'sale_date',rt.sale_date,'status',rt.status,'sale_price',rt.sale_price,'additional_costs',rt.additional_costs,'sales_channel',rt.sales_channel,'invoice_reference',rt.invoice_reference,'handover_completed_at',rt.handover_completed_at,'asset_sku',ia.sku,'manufacturer',ia.manufacturer,'model',ia.model,'listing_title',rl.listing_title,'listing_reference',rl.listing_reference,'listing_url',rl.listing_url,'fulfilment',(select jsonb_build_object('status',sf.status,'carrier',sf.carrier,'tracking_number',sf.tracking_number,'label_created_at',sf.label_created_at,'collected_at',sf.collected_at,'delivered_at',sf.delivered_at) from public.sales_fulfillments sf where sf.asset_id=rt.asset_id and (rt.listing_id is null or sf.listing_id=rt.listing_id) order by sf.created_at desc limit 1),'return_case',(select jsonb_build_object('status',scr.status,'reason',scr.reason,'customer_notes',scr.customer_notes,'created_at',scr.created_at,'resolved_at',scr.resolved_at,'refused_at',scr.refused_at,'refusal_reason',scr.refusal_reason,'resolution_summary',scr.resolution_summary,'refund_amount',scr.refund_amount,'refund_reference',scr.refund_reference,'replacement_reference',scr.replacement_reference) from public.sales_customer_returns scr where scr.asset_id=rt.asset_id order by scr.created_at desc limit 1)) order by rt.sale_date desc),'[]'::jsonb) data
 from public.resale_transactions rt left join public.inventory_assets ia on ia.id=rt.asset_id left join public.resale_listings rl on rl.id=rt.listing_id where rt.buyer_user_id=p_user_id
)
select jsonb_build_object('customer',(select data from customer),'valuations',(select data from vals),'sales',(select data from sales_data),'retail_purchases',(select data from retail_data));
$function$;
