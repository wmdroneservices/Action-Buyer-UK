-- Canonicalise known duplicate catalogue labels and prevent their reintroduction.

create or replace function public.canonical_quote_catalog_label(p_value text)
returns text language sql immutable as $$
  select case lower(btrim(coalesce(p_value,'')))
    when 'action camera accessory' then 'Action Camera Accessories'
    when 'action camera accessories' then 'Action Camera Accessories'
    when 'camera accessory' then 'Camera Accessories'
    when 'camera accessories' then 'Camera Accessories'
    when 'continuous light' then 'Continuous Lighting'
    when 'continuous lighting' then 'Continuous Lighting'
    when 'lens' then 'Lenses'
    when 'lenses' then 'Lenses'
    when 'battery' then 'Batteries'
    when 'batteries' then 'Batteries'
    when 'camera mount' then 'Camera Mounts'
    when 'camera mounts' then 'Camera Mounts'
    when 'camera support' then 'Camera Supports'
    when 'camera supports' then 'Camera Supports'
    when 'led video light' then 'LED Video Lights'
    when 'led video lights' then 'LED Video Lights'
    when 'flash accessory' then 'Flash Accessories'
    when 'flash accessories' then 'Flash Accessories'
    when 'light modifier' then 'Light Modifiers'
    when 'light modifiers' then 'Light Modifiers'
    when 'light stand' then 'Light Stands'
    when 'light stands' then 'Light Stands'
    when 'ring light' then 'Ring Lights'
    when 'ring lights' then 'Ring Lights'
    when 'teleprompter' then 'Teleprompters'
    when 'teleprompters' then 'Teleprompters'
    when 'tripod' then 'Tripods'
    when 'tripods' then 'Tripods'
    when 'video tripod' then 'Video Tripods'
    when 'video tripods' then 'Video Tripods'
    else nullif(btrim(p_value),'')
  end
$$;

update public.quote_catalog_products
set category=public.canonical_quote_catalog_label(category),
    main_category=public.canonical_quote_catalog_label(main_category),
    product_type=public.canonical_quote_catalog_label(product_type),
    updated_at=now()
where category is distinct from public.canonical_quote_catalog_label(category)
   or main_category is distinct from public.canonical_quote_catalog_label(main_category)
   or product_type is distinct from public.canonical_quote_catalog_label(product_type);

create or replace function public.canonicalize_quote_catalog_product_labels()
returns trigger language plpgsql as $$
begin
  new.category:=public.canonical_quote_catalog_label(new.category);
  new.main_category:=public.canonical_quote_catalog_label(new.main_category);
  new.product_type:=public.canonical_quote_catalog_label(new.product_type);
  return new;
end;
$$;

drop trigger if exists trg_canonicalize_quote_catalog_product_labels on public.quote_catalog_products;
create trigger trg_canonicalize_quote_catalog_product_labels
before insert or update of category,main_category,product_type
on public.quote_catalog_products for each row
execute function public.canonicalize_quote_catalog_product_labels();
