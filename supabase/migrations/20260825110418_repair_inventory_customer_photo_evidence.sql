alter table public.inventory_assets
  add column if not exists customer_condition text,
  add column if not exists customer_missing_items boolean not null default false,
  add column if not exists customer_missing_items_details text,
  add column if not exists customer_damage boolean not null default false,
  add column if not exists customer_exception_notes text;

create index if not exists inventory_evidence_asset_type_idx
  on public.inventory_evidence(asset_id,evidence_type);

create policy "Staff can upload inventory photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='quote-photos'
    and exists(select 1 from public.staff_users s where s.user_id=auth.uid())
    and (storage.foldername(name))[1]=auth.uid()::text
  );

update public.inventory_assets ia
set customer_condition=coalesce(ia.customer_condition, nullif(trim(coalesce(qi.item_data->>'condition','')), ''), nullif(trim(coalesce(qi.item_data->'singleItem'->>'condition','')), '')),
    customer_missing_items=coalesce(ia.customer_missing_items, coalesce((qi.item_data->>'missingItems')::boolean,false)),
    customer_missing_items_details=coalesce(ia.customer_missing_items_details, nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), '')),
    customer_damage=coalesce(ia.customer_damage, coalesce((qi.item_data->>'damage')::boolean,false)),
    customer_exception_notes=coalesce(ia.customer_exception_notes, nullif(trim(coalesce(qi.item_data->>'exceptionNotes','')), '')),
    updated_at=now()
from public.quote_items qi
where qi.id=ia.source_quote_item_id;

insert into public.inventory_evidence(asset_id,evidence_type,file_url,description)
select ia.id,'Photographs',p.value->>'path',coalesce(p.value->>'name','Customer supplied photograph')
from public.inventory_assets ia
join public.quote_items qi on qi.id=ia.source_quote_item_id
cross join lateral jsonb_array_elements(coalesce(qi.item_data->'photos','[]'::jsonb)) p
where jsonb_typeof(qi.item_data->'photos')='array'
  and nullif(trim(coalesce(p.value->>'path','')), '') is not null
  and not exists(select 1 from public.inventory_evidence ie where ie.asset_id=ia.id and ie.file_url=p.value->>'path');
