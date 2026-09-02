-- Remove exact duplicate online-comparison evidence and prevent it from returning.
-- Keep the newest checked/updated record in each identical evidence group.

with ranked as (
  select id,
         row_number() over (
           partition by catalog_product_id,
             lower(trim(coalesce(retailer,''))),
             lower(trim(coalesce(price_type,''))),
             lower(trim(coalesce(condition,''))),
             coalesce(buy_price,-1),
             coalesce(sell_price,-1),
             lower(trim(coalesce(source_url,'')))
           order by checked_at desc nulls last, updated_at desc nulls last, created_at desc nulls last, id desc
         ) as rn
  from public.quote_catalog_retailer_prices
)
delete from public.quote_catalog_retailer_prices r
using ranked x
where r.id=x.id and x.rn>1;

-- One product identity per manufacturer/model/package name.
create unique index if not exists quote_catalog_products_normalized_identity_uidx
on public.quote_catalog_products (
  lower(trim(manufacturer)),
  lower(trim(model)),
  lower(trim(coalesce(package_name,package_key,'')))
);

-- Block identical evidence observations even when casing or trailing spaces differ.
create unique index if not exists quote_catalog_retailer_prices_normalized_evidence_uidx
on public.quote_catalog_retailer_prices (
  catalog_product_id,
  lower(trim(coalesce(retailer,''))),
  lower(trim(coalesce(price_type,''))),
  lower(trim(coalesce(condition,''))),
  coalesce(buy_price,-1),
  coalesce(sell_price,-1),
  lower(trim(coalesce(source_url,'')))
);
