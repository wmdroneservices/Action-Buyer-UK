-- Fix receipt/catalog resolver failure on PostgreSQL UUID aggregation.
-- PostgreSQL has no min(uuid) aggregate. The receipt RPC calls this resolver
-- while creating a received inventory asset, so the invalid aggregate aborted
-- the whole receipt transaction before sales.status could become 'received'.

create or replace function public.resolve_quote_item_catalog_product(p_quote_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_q public.quote_items%rowtype;
  v_id uuid;
  v_count integer;
begin
  if not exists(
    select 1
    from public.staff_users s
    where s.user_id=auth.uid() and s.active=true
  ) then
    return null;
  end if;

  select * into v_q
  from public.quote_items
  where id=p_quote_item_id;

  if not found then
    return null;
  end if;

  select
    count(*),
    (array_agg(id))[1]
  into v_count,v_id
  from public.quote_catalog_products p
  where lower(trim(coalesce(p.manufacturer,'')))=lower(trim(coalesce(v_q.manufacturer,'')))
    and lower(trim(coalesce(p.model,'')))=lower(trim(coalesce(v_q.model,'')))
    and lower(trim(coalesce(p.package_name,'')))=lower(trim(coalesce(v_q.package,'')));

  if v_count=1 then
    return v_id;
  end if;

  return null;
end;
$$;

revoke all on function public.resolve_quote_item_catalog_product(uuid) from public;
grant execute on function public.resolve_quote_item_catalog_product(uuid) to authenticated;
