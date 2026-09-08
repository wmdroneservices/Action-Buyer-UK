-- Canonical retail category routing.
-- Source catalogue taxonomy remains unchanged; public retail navigation uses a stable shared taxonomy.

create or replace function public.canonical_storefront_category(p_main_category text,p_category text,p_product_type text default null)
returns text language plpgsql immutable set search_path to 'public' as $$
declare
  v text := lower(concat_ws(' ', nullif(btrim(coalesce(p_main_category,'')),''), nullif(btrim(coalesce(p_category,'')),''), nullif(btrim(coalesce(p_product_type,'')),'')));
  v_main text := lower(btrim(coalesce(p_main_category,'')));
  v_category text := lower(btrim(coalesce(p_category,'')));
  v_type text := lower(btrim(coalesce(p_product_type,'')));
begin
  if v like '%action camera accessory%' then return 'Camera Accessories'; end if;
  if v like '%drone accessory%' or v like '%fpv equipment%' or v like '%payload%' or v like '%goggles%' or v like '%remote controller%' or v like '%controller%' and v like '%drone%' then return 'Drone Accessories'; end if;
  if v_main like '%drone%' or v_category like '%drone%' or v_type like '%drone%' then return 'Drones'; end if;
  if v like '%professional audio%' or v like '%audio%' or v like '%microphone%' or v like '%wireless sync%' then return 'Audio'; end if;
  if v like '%power%' or v like '%batter%' then return 'Power & Batteries'; end if;
  if v like '%lens%' or v like '%optics%' then return 'Lenses'; end if;
  if v like '%lighting%' or v like '%light%' or v like '%camera flash%' then return 'Lighting'; end if;
  if v like '%tripod%' or v like '%support%' or v like '%gimbal%' or v like '%stabilis%' or v like '%stabiliz%' or v like '%monopod%' then return 'Supports & Stabilisation'; end if;
  if v like '%studio equipment%' then return 'Studio Equipment'; end if;
  if v like '%video camera%' or v like '%cinema camera%' or v like '%camcorder%' or v like '%body camera%' or v like '%broadcast camera%' or v like '%ptz camera%' or v like '%remote camera%' then return 'Video Cameras'; end if;
  if v like '%video production%' or v like '%video equipment%' or v like '%camera rig%' or v like '%camera control%' or v like '%camera monitor%' or v like '%camera slider%' or v like '%switcher%' or v like '%recorder%' or v like '%deck/%' or v like '%streaming%' or v like '%transmission%' or v like '%audio & video%' or v like '%camera & video%' then return 'Video Production Equipment'; end if;
  if v like '%accessor%' or v like '%camera bag%' or v like '%bag%' or v like '%case%' then return 'Camera Accessories'; end if;
  if v like '%camera equipment%' or v like '%camera%' or v like '%phone photography%' then return 'Cameras'; end if;
  return 'Other Equipment';
end;
$$;

create or replace function public.public_storefront_categories(p_store_key text default 'retail')
returns table(category text, product_count bigint)
language sql stable security definer set search_path to 'public' as $$
  with sf as (select id from public.sales_storefronts where store_key=p_store_key and active=true limit 1),
  visible_products as (
    select public.canonical_storefront_category(p.main_category,p.category,p.product_type) as category,p.id
    from public.quote_catalog_products p cross join sf
    left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=p.manufacturer
    left join public.sales_catalog_visibility cv_raw on cv_raw.storefront_id=sf.id and cv_raw.scope_type='category' and cv_raw.scope_key=coalesce(p.main_category,p.category)
    left join public.sales_catalog_visibility cv_canonical on cv_canonical.storefront_id=sf.id and cv_canonical.scope_type='category' and cv_canonical.scope_key=public.canonical_storefront_category(p.main_category,p.category,p.product_type)
    left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=p.id::text
    where coalesce(mv.visibility_mode,'auto')<>'hide'
      and coalesce(cv_canonical.visibility_mode,cv_raw.visibility_mode,'auto')<>'hide'
      and coalesce(pv.visibility_mode,'auto')<>'hide'
  )
  select category,count(*)::bigint from visible_products group by category order by category;
$$;

create or replace function public.public_storefront_catalog(p_store_key text default 'retail',p_manufacturer text default null,p_category text default null,p_search text default null,p_limit integer default 120,p_offset integer default 0)
returns table(id uuid,category text,main_category text,product_type text,manufacturer text,model text,package_key text,package_name text,hero_image_url text,manufacturer_image_url text,product_description text,available_units bigint)
language sql stable security definer set search_path to 'public' as $$
  with sf as (select id from public.sales_storefronts where store_key=p_store_key and active=true limit 1),
  catalog as (
    select p.id,p.category,public.canonical_storefront_category(p.main_category,p.category,p.product_type) as main_category,p.product_type,p.manufacturer,p.model,p.package_key,p.package_name,csc.hero_image_url,csc.manufacturer_image_url,csc.product_description
    from public.quote_catalog_products p cross join sf
    left join public.catalog_sales_content csc on csc.catalog_product_id=p.id
    left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=p.manufacturer
    left join public.sales_catalog_visibility cv_raw on cv_raw.storefront_id=sf.id and cv_raw.scope_type='category' and cv_raw.scope_key=coalesce(p.main_category,p.category)
    left join public.sales_catalog_visibility cv_canonical on cv_canonical.storefront_id=sf.id and cv_canonical.scope_type='category' and cv_canonical.scope_key=public.canonical_storefront_category(p.main_category,p.category,p.product_type)
    left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=p.id::text
    where coalesce(mv.visibility_mode,'auto')<>'hide'
      and coalesce(cv_canonical.visibility_mode,cv_raw.visibility_mode,'auto')<>'hide'
      and coalesce(pv.visibility_mode,'auto')<>'hide'
      and (p_manufacturer is null or p.manufacturer=p_manufacturer)
      and (p_category is null or public.canonical_storefront_category(p.main_category,p.category,p.product_type)=p_category)
      and (p_search is null or btrim(p_search)='' or concat_ws(' ',p.manufacturer,p.model,p.package_name,p.category,p.main_category,p.product_type) ilike '%'||btrim(p_search)||'%')
  ), stock as (
    select a.catalog_product_id,count(*)::bigint available_units
    from public.resale_listings rl join public.inventory_assets a on a.id=rl.asset_id join public.sales_outlets o on o.id=rl.outlet_id
    where rl.status='Published' and o.outlet_code='WEBSITE' and o.active=true and a.status<>'Sold' and a.catalog_product_id is not null
    group by a.catalog_product_id
  )
  select c.id,c.category,c.main_category,c.product_type,c.manufacturer,c.model,c.package_key,c.package_name,c.hero_image_url,c.manufacturer_image_url,c.product_description,coalesce(s.available_units,0)::bigint
  from catalog c left join stock s on s.catalog_product_id=c.id
  order by case when coalesce(s.available_units,0)>0 then 0 else 1 end,c.manufacturer,c.model,c.package_name
  limit greatest(1,least(coalesce(p_limit,120),500)) offset greatest(0,coalesce(p_offset,0));
$$;

create or replace function public.public_storefront_category_manufacturers(p_store_key text default 'retail',p_category text default null)
returns table(manufacturer text,product_count bigint,representative_model text)
language sql stable security definer set search_path to 'public' as $$
with sf as (select id from public.sales_storefronts where store_key=p_store_key and active=true limit 1),
visible_products as (
  select p.manufacturer,p.model
  from public.quote_catalog_products p cross join sf
  left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=p.manufacturer
  left join public.sales_catalog_visibility cv_raw on cv_raw.storefront_id=sf.id and cv_raw.scope_type='category' and cv_raw.scope_key=coalesce(p.main_category,p.category)
  left join public.sales_catalog_visibility cv_canonical on cv_canonical.storefront_id=sf.id and cv_canonical.scope_type='category' and cv_canonical.scope_key=public.canonical_storefront_category(p.main_category,p.category,p.product_type)
  left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=p.id::text
  where p_category is not null and public.canonical_storefront_category(p.main_category,p.category,p.product_type)=p_category
    and coalesce(mv.visibility_mode,'auto')<>'hide'
    and coalesce(cv_canonical.visibility_mode,cv_raw.visibility_mode,'auto')<>'hide'
    and coalesce(pv.visibility_mode,'auto')<>'hide'
    and coalesce(btrim(p.manufacturer),'')<>''
)
select manufacturer,count(*)::bigint,min(nullif(btrim(model),'')) from visible_products group by manufacturer order by manufacturer;
$$;

create or replace function public.public_storefront_models(p_store_key text default 'retail',p_category text default null,p_manufacturer text default null)
returns table(model text,product_count bigint,representative_product_id uuid,package_count bigint)
language sql stable security definer set search_path to 'public' as $$
with sf as (select id from public.sales_storefronts where store_key=p_store_key and active=true limit 1),
visible_products as (
  select p.id,p.model,p.package_name
  from public.quote_catalog_products p cross join sf
  left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=p.manufacturer
  left join public.sales_catalog_visibility cv_raw on cv_raw.storefront_id=sf.id and cv_raw.scope_type='category' and cv_raw.scope_key=coalesce(p.main_category,p.category)
  left join public.sales_catalog_visibility cv_canonical on cv_canonical.storefront_id=sf.id and cv_canonical.scope_type='category' and cv_canonical.scope_key=public.canonical_storefront_category(p.main_category,p.category,p.product_type)
  left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=p.id::text
  where p_category is not null and p_manufacturer is not null
    and public.canonical_storefront_category(p.main_category,p.category,p.product_type)=p_category and p.manufacturer=p_manufacturer
    and coalesce(mv.visibility_mode,'auto')<>'hide'
    and coalesce(cv_canonical.visibility_mode,cv_raw.visibility_mode,'auto')<>'hide'
    and coalesce(pv.visibility_mode,'auto')<>'hide'
    and coalesce(btrim(p.model),'')<>''
)
select model,count(*)::bigint,(array_agg(id order by id))[1],count(distinct nullif(btrim(package_name),''))::bigint
from visible_products group by model order by model;
$$;

create or replace function public.public_storefront_stock(p_store_key text default 'retail',p_category text default null,p_manufacturer text default null,p_model text default null)
returns table(listing_id uuid,listing_reference text,listing_title text,asking_price numeric,published_at timestamp with time zone,manufacturer text,model text,package_name text,condition_grade text,product_description text,hero_image_url text)
language sql stable security definer set search_path to 'public' as $$
with sf as (select id from public.sales_storefronts where store_key=p_store_key and active=true limit 1)
select rl.id,rl.listing_reference,rl.listing_title,rl.asking_price,rl.published_at,a.manufacturer,a.model,a.package_name,a.condition_grade,coalesce(isc.condition_description,a.description),isc.hero_image_url
from public.resale_listings rl
join public.inventory_assets a on a.id=rl.asset_id
join public.sales_outlets o on o.id=rl.outlet_id
cross join sf
left join public.inventory_sales_content isc on isc.asset_id=a.id
left join public.quote_catalog_products p on p.id=a.catalog_product_id
left join public.sales_catalog_visibility mv on mv.storefront_id=sf.id and mv.scope_type='manufacturer' and mv.scope_key=a.manufacturer
left join public.sales_catalog_visibility cv_raw on cv_raw.storefront_id=sf.id and cv_raw.scope_type='category' and cv_raw.scope_key=coalesce(p.main_category,p.category)
left join public.sales_catalog_visibility cv_canonical on cv_canonical.storefront_id=sf.id and cv_canonical.scope_type='category' and cv_canonical.scope_key=public.canonical_storefront_category(p.main_category,p.category,p.product_type)
left join public.sales_catalog_visibility pv on pv.storefront_id=sf.id and pv.scope_type='product' and pv.scope_key=a.catalog_product_id::text
where rl.status='Published' and o.outlet_code='WEBSITE' and o.active=true and a.status<>'Sold' and a.archived_at is null
  and (p_category is null or public.canonical_storefront_category(p.main_category,p.category,p.product_type)=p_category)
  and (p_manufacturer is null or a.manufacturer=p_manufacturer)
  and (p_model is null or a.model=p_model)
  and coalesce(mv.visibility_mode,'auto')<>'hide'
  and coalesce(cv_canonical.visibility_mode,cv_raw.visibility_mode,'auto')<>'hide'
  and coalesce(pv.visibility_mode,'auto')<>'hide'
order by rl.published_at desc nulls last,rl.created_at desc;
$$;

grant execute on function public.canonical_storefront_category(text,text,text) to anon, authenticated;
grant execute on function public.public_storefront_categories(text) to anon, authenticated;
grant execute on function public.public_storefront_catalog(text,text,text,text,integer,integer) to anon, authenticated;
grant execute on function public.public_storefront_category_manufacturers(text,text) to anon, authenticated;
grant execute on function public.public_storefront_models(text,text,text) to anon, authenticated;
grant execute on function public.public_storefront_stock(text,text,text,text) to anon, authenticated;
