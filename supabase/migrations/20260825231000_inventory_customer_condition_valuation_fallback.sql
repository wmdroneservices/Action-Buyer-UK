create or replace function public.sync_inventory_customer_details()
returns trigger language plpgsql security definer set search_path=public as $$
declare q jsonb; c text; pkg text; valuation_condition text;
begin
  if new.source_quote_item_id is null then return new; end if;
  select qi.item_data, qi.package, v.condition
    into q, pkg, valuation_condition
  from public.quote_items qi
  left join public.valuations v on v.id=qi.valuation_id
  where qi.id=new.source_quote_item_id;
  if q is null then return new; end if;
  c:=nullif(trim(coalesce(q->>'condition','')), '');
  if c is null then c:=nullif(trim(coalesce(q->'singleItem'->>'condition','')), ''); end if;
  if c is null then c:=nullif(trim(coalesce(valuation_condition,'')), ''); end if;
  new.customer_condition:=coalesce(new.customer_condition,c);
  new.customer_package_name:=coalesce(new.customer_package_name,nullif(trim(pkg),''));
  new.customer_missing_items:=coalesce(new.customer_missing_items,coalesce((q->>'missingItems')::boolean,false));
  new.customer_missing_items_details:=coalesce(new.customer_missing_items_details,nullif(trim(coalesce(q->>'exceptionNotes','')),''));
  new.customer_damage:=coalesce(new.customer_damage,coalesce((q->>'damage')::boolean,false));
  new.customer_exception_notes:=coalesce(new.customer_exception_notes,nullif(trim(coalesce(q->>'exceptionNotes','')),''));
  return new;
end; $$;

drop trigger if exists inventory_assets_sync_customer_details on public.inventory_assets;
create trigger inventory_assets_sync_customer_details
before insert or update of source_quote_item_id on public.inventory_assets
for each row execute function public.sync_inventory_customer_details();

update public.inventory_assets ia
set customer_condition=coalesce(ia.customer_condition,
      nullif(trim(coalesce(qi.item_data->>'condition','')), ''),
      nullif(trim(coalesce(qi.item_data->'singleItem'->>'condition','')), ''),
      nullif(trim(coalesce(v.condition,'')), '')),
    customer_package_name=coalesce(ia.customer_package_name,nullif(trim(qi.package),'')),
    updated_at=now()
from public.quote_items qi
left join public.valuations v on v.id=qi.valuation_id
where qi.id=ia.source_quote_item_id;
