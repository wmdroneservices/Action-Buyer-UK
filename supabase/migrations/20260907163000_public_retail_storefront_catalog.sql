-- Public retail storefront catalogue read model.
-- Stage 1: complete central catalogue, visibility controls and safe public RPCs.
-- Additive only. No duplicate catalogue or inventory truth.

create or replace function public.public_storefront_manufacturers(
  p_store_key text default 'retail'
)
returns table(manufacturer text, product_count bigint, visibility_mode text, visible boolean)
language sql stable security definer set search_path=public
as $$
  with sf as (
    select id from public.sales_storefronts
    where store_key=p_store_key and active=true limit 1
  ), counts as (
    select manufacturer, count(*)::bigint as product_count
    from public.quote_catalog_products
    where coalesce(btrim(manufacturer),'') <> ''
    group by manufacturer
  )
  select c.manufacturer,c.product_count,
         coalesce(v.visibility_mode,'auto') as visibility_mode,
         coalesce(v.visibility_mode,'auto') <> 'hide' as visible
  from counts c cross join sf
  left join public.sales_catalog_visibility v
    on v.storefront_id=sf.id and v.scope_type='manufacturer' and v.scope_key=c.manufacturer
  order by c.manufacturer;
$$;

revoke all on function public.public_storefront_manufacturers(text) from public;
grant execute on function public.public_storefront_manufacturers(text) to anon, authenticated;

create or replace function public.public_storefront_catalog(
  p_store_key text default 'retail',
  p_manufacturer text default null,
  p_category text default null,
  p_search text default null,
  p_limit integer default 120,
  p_offset integer default 0
)
returns table(
  id uuid, category text, main_category text, product_type text,
  manufacturer text, model text, package_key text, package_name text,
  hero_image_url text, manufacturer_image_url text, product_description text,
  available_units bigint
)
language sql stable security definer set search_path=public
as $$
  with sf as (
    select id from public.sales_storefronts
    where store_key=p_store_key and active=true limit 1
  ), catalog as (
    select p.id,p.category,p.main_category,p.product_type,p.manufacturer,p.model,
           p.package_key,p.package_name,csc.hero_image_url,csc.manufacturer_image_url,csc.product_description
    from public.quote_catalog_products p
    cross join sf
    left join public.catalog_sales_content csc on csc.catalog_product_id=p.id
    left join public.sales_catalog_visibility mv
      on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=p.manufacturer
    left join public.sales_catalog_visibility cv
      on cv.storefront_id=sf.id and cv.scope_type='category' and cv.scope_key=coalesce(p.main_category,p.category)
    left join public.sales_catalog_visibility pv
      on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=p.id::text
    where coalesce(mv.visibility_mode,'auto') <> 'hide'
      and coalesce(cv.visibility_mode,'auto') <> 'hide'
      and coalesce(pv.visibility_mode,'auto') <> 'hide'
      and (p_manufacturer is null or p.manufacturer=p_manufacturer)
      and (p_category is null or coalesce(p.main_category,p.category)=p_category)
      and (p_search is null or btrim(p_search)='' or
           concat_ws(' ',p.manufacturer,p.model,p.package_name,p.category,p.main_category,p.product_type)
           ilike '%'||btrim(p_search)||'%')
  ), stock as (
    select a.catalog_product_id,count(*)::bigint available_units
    from public.resale_listings rl
    join public.inventory_assets a on a.id=rl.asset_id
    join public.sales_outlets o on o.id=rl.outlet_id
    where rl.status='Published' and o.outlet_code='WEBSITE' and o.active=true
      and a.status <> 'Sold' and a.catalog_product_id is not null
    group by a.catalog_product_id
  )
  select c.id,c.category,c.main_category,c.product_type,c.manufacturer,c.model,c.package_key,c.package_name,
         c.hero_image_url,c.manufacturer_image_url,c.product_description,coalesce(s.available_units,0)::bigint
  from catalog c left join stock s on s.catalog_product_id=c.id
  order by case when coalesce(s.available_units,0)>0 then 0 else 1 end,c.manufacturer,c.model,c.package_name
  limit greatest(1,least(coalesce(p_limit,120),500))
  offset greatest(0,coalesce(p_offset,0));
$$;

revoke all on function public.public_storefront_catalog(text,text,text,text,integer,integer) from public;
grant execute on function public.public_storefront_catalog(text,text,text,text,integer,integer) to anon, authenticated;
