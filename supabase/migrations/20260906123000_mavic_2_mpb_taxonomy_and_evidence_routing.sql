-- Mavic 2 MPB taxonomy correction.
-- Keep controller packages, Fly More bundles and filter kits as distinct catalogue identities.

begin;

update public.quote_catalog_products
set package_key='rc1-controller',
    package_name='With RC1 Controller',
    notes=trim(coalesce(notes,'') || ' Exact MPB base-product taxonomy: DJI Mavic 2 Zoom with RC1 Controller.'),
    updated_at=now()
where manufacturer='DJI' and model='Mavic 2 Zoom' and package_key='standard';

insert into public.quote_catalog_products
(category,main_category,product_type,manufacturer,model,package_key,package_name,active,customer_visible,notes)
select 'Drone','Drones','Camera Drones','DJI','Mavic 2 Zoom','smart-controller','With Smart Controller',true,true,
       'Exact MPB catalogue taxonomy confirmed; page may be out of stock but identity is retained for correct matching.'
where not exists (select 1 from public.quote_catalog_products where manufacturer='DJI' and model='Mavic 2 Zoom' and package_key='smart-controller');

insert into public.quote_catalog_products
(category,main_category,product_type,manufacturer,model,package_key,package_name,active,customer_visible,notes)
select 'Drone','Drones','Camera Drones','DJI','Mavic 2 Pro','smart-controller','With DJI Smart Controller',true,true,
       'Exact MPB catalogue taxonomy confirmed.'
where not exists (select 1 from public.quote_catalog_products where manufacturer='DJI' and model='Mavic 2 Pro' and package_key='smart-controller');

insert into public.quote_catalog_products
(category,main_category,product_type,manufacturer,model,package_key,package_name,active,customer_visible,notes)
select 'Drone','Drones','Camera Drones','DJI','Mavic 2 Pro','fly-more-smart-controller','Fly More Combo with Smart Controller',true,true,
       'Exact MPB catalogue taxonomy confirmed.'
where not exists (select 1 from public.quote_catalog_products where manufacturer='DJI' and model='Mavic 2 Pro' and package_key='fly-more-smart-controller');

insert into public.quote_catalog_products
(category,main_category,product_type,manufacturer,model,package_key,package_name,active,customer_visible,notes)
select 'Accessory','Camera Accessories','Camera Accessories','DJI','Mavic 2 Zoom ND Filter Kit','standard','Standard Item',true,true,
       'Exact MPB accessory product; kept separate from Mavic 2 Zoom aircraft pricing.'
where not exists (select 1 from public.quote_catalog_products where manufacturer='DJI' and model='Mavic 2 Zoom ND Filter Kit' and package_key='standard');

insert into public.quote_catalog_products
(category,main_category,product_type,manufacturer,model,package_key,package_name,active,customer_visible,notes)
select 'Accessory','Camera Accessories','Camera Accessories','DJI','Mavic 2 Pro ND Filters Set','standard','Standard Item',true,true,
       'Exact MPB accessory product; kept separate from Mavic 2 Pro aircraft pricing.'
where not exists (select 1 from public.quote_catalog_products where manufacturer='DJI' and model='Mavic 2 Pro ND Filters Set' and package_key='standard');

insert into public.quote_catalog_retailer_prices
(catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes,price_type,availability_status,price_currency,price_region,evidence_region,reference_price_min,reference_price_max,reference_conditions,reference_units_observed,reference_only)
select p.id,'MPB UK','Excellent, Good',359,now(),
'https://www.mpb.com/en-uk/product/dji-mavic-2-pro-with-dji-smart-controller',
'Exact MPB UK product page; 2 live units observed; £359-£374. Reference-only evidence.',
'used','in_stock','GBP','UK','UK',359,374,'Excellent, Good',2,true
from public.quote_catalog_products p
where p.manufacturer='DJI' and p.model='Mavic 2 Pro' and p.package_key='smart-controller'
and not exists (select 1 from public.quote_catalog_retailer_prices r where r.catalog_product_id=p.id and r.source_url='https://www.mpb.com/en-uk/product/dji-mavic-2-pro-with-dji-smart-controller');

insert into public.quote_catalog_retailer_prices
(catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes,price_type,availability_status,price_currency,price_region,evidence_region,reference_price_min,reference_price_max,reference_conditions,reference_units_observed,reference_only)
select p.id,'MPB UK','Excellent',639,now(),
'https://www.mpb.com/en-uk/product/dji-mavic-2-pro-fly-more-combo-with-smart-controller',
'Exact MPB UK product page; 1 live unit observed at £639. Reference-only evidence.',
'used','in_stock','GBP','UK','UK',639,639,'Excellent',1,true
from public.quote_catalog_products p
where p.manufacturer='DJI' and p.model='Mavic 2 Pro' and p.package_key='fly-more-smart-controller'
and not exists (select 1 from public.quote_catalog_retailer_prices r where r.catalog_product_id=p.id and r.source_url='https://www.mpb.com/en-uk/product/dji-mavic-2-pro-fly-more-combo-with-smart-controller');

insert into public.quote_catalog_retailer_prices
(catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes,price_type,availability_status,price_currency,price_region,evidence_region,reference_only)
select p.id,'MPB UK','Unknown',null,now(),
'https://www.mpb.com/en-uk/product/dji-mavic-2-zoom-with-smart-controller',
'Exact MPB UK product page confirmed; currently out of stock. No live price invented.',
'used','out_of_stock','GBP','UK','UK',true
from public.quote_catalog_products p
where p.manufacturer='DJI' and p.model='Mavic 2 Zoom' and p.package_key='smart-controller'
and not exists (select 1 from public.quote_catalog_retailer_prices r where r.catalog_product_id=p.id and r.source_url='https://www.mpb.com/en-uk/product/dji-mavic-2-zoom-with-smart-controller');

-- Route any pending exact Deep Source ND Filter Kit finding away from the aircraft and into the accessory.
update public.quote_catalog_ai_candidates c
set original_catalog_product_id=coalesce(c.original_catalog_product_id,c.catalog_product_id),
    catalog_product_id=p.id,
    reassigned_at=now(),
    reassignment_reason='Exact MPB evidence belongs to the separately catalogued DJI Mavic 2 Zoom ND Filter Kit, not the Mavic 2 Zoom aircraft.',
    edited_package_match='exact',
    edited_variant_match='exact'
from public.quote_catalog_products p
where p.manufacturer='DJI' and p.model='Mavic 2 Zoom ND Filter Kit' and p.package_key='standard'
  and c.source_url='https://www.mpb.com/en-uk/product/dji-mavic-2-zoom-nd-filter-kit'
  and c.decision='pending' and c.applied_at is null;

-- Mark exact RC1 discoveries against the corrected exact package identity.
update public.quote_catalog_ai_candidates
set edited_package_match='exact',
    edited_variant_match='exact'
where source_url='https://www.mpb.com/en-uk/product/dji-mavic-2-zoom'
  and catalog_product_id in (
    select id from public.quote_catalog_products
    where manufacturer='DJI' and model='Mavic 2 Zoom' and package_key='rc1-controller'
  );

commit;
