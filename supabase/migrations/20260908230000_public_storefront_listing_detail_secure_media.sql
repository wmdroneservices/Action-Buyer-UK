-- Public storefront product detail and secure listing-media bridge.
-- Private quote-photos paths remain private and are never returned by public SQL RPCs.

create or replace function public.public_storefront_listing(
  p_store_key text default 'retail',
  p_listing_id uuid default null
)
returns table(
  listing_id uuid,
  listing_reference text,
  listing_title text,
  asking_price numeric,
  published_at timestamptz,
  manufacturer text,
  model text,
  package_name text,
  condition_grade text,
  product_description text,
  listing_notes text,
  postage_packing numeric,
  hero_image_url text
)
language sql stable security definer set search_path=public
as $$
  with sf as (
    select id from public.sales_storefronts
    where store_key=p_store_key and active=true limit 1
  )
  select rl.id,rl.listing_reference,rl.listing_title,rl.asking_price,rl.published_at,
         a.manufacturer,a.model,a.package_name,a.condition_grade,
         coalesce(isc.condition_description,a.description),
         isc.listing_notes,isc.postage_packing,isc.hero_image_url
  from public.resale_listings rl
  join public.inventory_assets a on a.id=rl.asset_id
  join public.sales_outlets o on o.id=rl.outlet_id
  cross join sf
  left join public.inventory_sales_content isc on isc.asset_id=a.id
  left join public.quote_catalog_products p on p.id=a.catalog_product_id
  left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=a.manufacturer
  left join public.sales_catalog_visibility cv on cv.storefront_id=sf.id and cv.scope_type='category' and cv.scope_key=coalesce(p.main_category,p.category)
  left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=a.catalog_product_id::text
  where p_listing_id is not null and rl.id=p_listing_id
    and rl.status='Published' and o.outlet_code='WEBSITE' and o.active=true
    and a.status<>'Sold' and a.archived_at is null
    and coalesce(mv.visibility_mode,'auto')<>'hide'
    and coalesce(cv.visibility_mode,'auto')<>'hide'
    and coalesce(pv.visibility_mode,'auto')<>'hide';
$$;

revoke all on function public.public_storefront_listing(text,uuid) from public;
grant execute on function public.public_storefront_listing(text,uuid) to anon, authenticated;

create or replace function public.public_storefront_listing_media_paths_internal(
  p_store_key text,
  p_listing_id uuid
)
returns text[]
language sql stable security definer set search_path=public
as $$
  with sf as (
    select id from public.sales_storefronts
    where store_key=p_store_key and active=true limit 1
  ),
  selected as (
    select isc.listing_photo_paths
    from public.resale_listings rl
    join public.inventory_assets a on a.id=rl.asset_id
    join public.sales_outlets o on o.id=rl.outlet_id
    cross join sf
    left join public.inventory_sales_content isc on isc.asset_id=a.id
    left join public.quote_catalog_products p on p.id=a.catalog_product_id
    left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=a.manufacturer
    left join public.sales_catalog_visibility cv on cv.storefront_id=sf.id and cv.scope_type='category' and cv.scope_key=coalesce(p.main_category,p.category)
    left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=a.catalog_product_id::text
    where rl.id=p_listing_id
      and rl.status='Published' and o.outlet_code='WEBSITE' and o.active=true
      and a.status<>'Sold' and a.archived_at is null
      and coalesce(mv.visibility_mode,'auto')<>'hide'
      and coalesce(cv.visibility_mode,'auto')<>'hide'
      and coalesce(pv.visibility_mode,'auto')<>'hide'
  ),
  paths as (
    select distinct btrim(path) as path
    from selected
    cross join lateral jsonb_array_elements_text(coalesce(listing_photo_paths,'[]'::jsonb)) as path
    where btrim(path)<>''
  )
  select coalesce(array_agg(path order by path),'{}'::text[]) from paths;
$$;

revoke all on function public.public_storefront_listing_media_paths_internal(text,uuid) from public,anon,authenticated;
grant execute on function public.public_storefront_listing_media_paths_internal(text,uuid) to service_role;
