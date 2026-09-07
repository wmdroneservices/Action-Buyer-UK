-- Fix management_stock_strategy_report() ambiguity caused by unnamed COUNT() output columns.
-- Keep the report advisory and management-only.

CREATE OR REPLACE FUNCTION public.management_stock_strategy_report()
RETURNS TABLE(
 asset_id uuid,
 sku text,
 manufacturer text,
 model text,
 package_name text,
 asset_status text,
 purchase_price numeric,
 acquired_at timestamptz,
 days_in_stock integer,
 active_listing_count integer,
 active_outlet_count integer,
 outlet_names text,
 available_outlet_count integer,
 missing_outlet_count integer,
 missing_outlet_names text,
 strategy_band text,
 recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.staff_users s
   WHERE s.user_id=auth.uid() AND s.active=true
     AND COALESCE(s.can_manage_staff,false)=true
 ) THEN
   RAISE EXCEPTION 'Management access required';
 END IF;

 RETURN QUERY
 WITH active_outlets AS (
   SELECT so.id,so.outlet_name FROM public.sales_outlets so WHERE so.active=true
 ),
 listing_summary AS (
   SELECT
     rl.asset_id,
     COUNT(*) FILTER (WHERE rl.status IN ('Draft','Ready For Listing','Published','Reserved'))::integer AS active_listing_count,
     COUNT(DISTINCT rl.outlet_id) FILTER (WHERE rl.status IN ('Draft','Ready For Listing','Published','Reserved'))::integer AS active_outlet_count,
     STRING_AGG(DISTINCT COALESCE(so.outlet_name,rl.sales_channel),', ' ORDER BY COALESCE(so.outlet_name,rl.sales_channel))
       FILTER (WHERE rl.status IN ('Draft','Ready For Listing','Published','Reserved')) AS outlet_names
   FROM public.resale_listings rl
   LEFT JOIN public.sales_outlets so ON so.id=rl.outlet_id
   GROUP BY rl.asset_id
 ),
 base AS (
   SELECT
     a.*,
     GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (NOW()-COALESCE(a.acquired_at,a.created_at)))/86400))::integer AS age_days,
     COALESCE(ls.active_listing_count,0)::integer AS listings,
     COALESCE(ls.active_outlet_count,0)::integer AS outlets,
     ls.outlet_names
   FROM public.inventory_assets a
   LEFT JOIN listing_summary ls ON ls.asset_id=a.id
   WHERE a.status NOT IN ('Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived','Disposed')
 ),
 coverage AS (
   SELECT
     b.*,
     (SELECT COUNT(*)::integer FROM active_outlets) AS available_outlets,
     GREATEST(0,(SELECT COUNT(*)::integer FROM active_outlets)-b.outlets) AS missing_outlets,
     (
       SELECT STRING_AGG(ao.outlet_name,', ' ORDER BY ao.outlet_name)
       FROM active_outlets ao
       WHERE NOT EXISTS (
         SELECT 1 FROM public.resale_listings rl
         WHERE rl.asset_id=b.id AND rl.outlet_id=ao.id
           AND rl.status IN ('Draft','Ready For Listing','Published','Reserved')
       )
     ) AS missing_outlet_names
   FROM base b
 )
 SELECT
   c.id,c.sku,c.manufacturer,c.model,c.package_name,c.status,c.purchase_price,c.acquired_at,
   c.age_days,c.listings,c.outlets,c.outlet_names,c.available_outlets,c.missing_outlets,c.missing_outlet_names,
   CASE
     WHEN c.listings=0 AND c.status IN ('Sent to Sales','Listed','Reserved') THEN 'NO ACTIVE LISTING'
     WHEN c.age_days>=120 THEN 'AUCTION / EXIT REVIEW'
     WHEN c.age_days>=90 THEN 'URGENT STRATEGY REVIEW'
     WHEN c.age_days>=60 AND c.missing_outlets>0 THEN 'EXPAND OUTLETS / PRICE REVIEW'
     WHEN c.age_days>=60 THEN 'PRICE / PRESENTATION REVIEW'
     WHEN c.age_days>=30 THEN 'REVIEW'
     ELSE 'NORMAL'
   END,
   CASE
     WHEN c.listings=0 AND c.status IN ('Sent to Sales','Listed','Reserved') THEN 'Open the Sales Workbench and create or restore at least one listing.'
     WHEN c.age_days>=120 AND c.missing_outlets>0 THEN 'Review for auction, clearance or another exit route; compare missing outlets before deciding. No automatic move is made.'
     WHEN c.age_days>=120 THEN 'Review for auction, clearance, bundle or alternative exit route. No automatic move is made.'
     WHEN c.age_days>=90 AND c.missing_outlets>0 THEN 'Urgent review: reassess price and presentation, then consider the missing outlets shown.'
     WHEN c.age_days>=90 THEN 'Urgent management review: reassess price, presentation and current outlet performance.'
     WHEN c.age_days>=60 AND c.missing_outlets>0 THEN 'Consider the missing active outlets and review asking price against current evidence.'
     WHEN c.age_days>=60 THEN 'Review asking price and presentation against current evidence.'
     WHEN c.age_days>=30 THEN 'Review listing performance and confirm current outlet strategy.'
     ELSE 'Continue current strategy and monitor.'
   END
 FROM coverage c
 ORDER BY c.age_days DESC,c.acquired_at ASC;
END;
$$;
