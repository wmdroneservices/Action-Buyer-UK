-- Expand the management stock strategy report with central Outlet Registry coverage.
-- Advisory/reporting only. No inventory, listing, outlet, price or sold-state mutation.
begin;
drop function if exists public.management_stock_strategy_report();
create function public.management_stock_strategy_report()
returns table(
 asset_id uuid,sku text,manufacturer text,model text,package_name text,asset_status text,purchase_price numeric,acquired_at timestamptz,days_in_stock integer,
 active_listing_count integer,active_outlet_count integer,outlet_names text,
 available_outlet_count integer,missing_outlet_count integer,missing_outlet_names text,
 strategy_band text,recommendation text
)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active=true and coalesce(s.can_manage_staff,false)=true) then raise exception 'Management access required'; end if;
 return query
 with active_outlets as (select id,outlet_name from public.sales_outlets where active=true),
 listing_summary as (
  select rl.asset_id,
   count(*) filter(where rl.status in ('Draft','Ready For Listing','Published','Reserved'))::integer as active_listing_count,
   count(distinct rl.outlet_id) filter(where rl.status in ('Draft','Ready For Listing','Published','Reserved'))::integer as active_outlet_count,
   string_agg(distinct coalesce(so.outlet_name,rl.sales_channel),', ' order by coalesce(so.outlet_name,rl.sales_channel)) filter(where rl.status in ('Draft','Ready For Listing','Published','Reserved')) as outlet_names
  from public.resale_listings rl left join public.sales_outlets so on so.id=rl.outlet_id group by rl.asset_id
 ),
 base as (
  select a.*,greatest(0,floor(extract(epoch from(now()-coalesce(a.acquired_at,a.created_at)))/86400))::integer as age_days,
   coalesce(ls.active_listing_count,0) as listings,coalesce(ls.active_outlet_count,0) as outlets,ls.outlet_names
  from public.inventory_assets a left join listing_summary ls on ls.asset_id=a.id where a.status not in ('Sold','Returned','Disposed')
 ),
 coverage as (
  select b.*,(select count(*)::integer from active_outlets) as available_outlets,
   greatest(0,(select count(*)::integer from active_outlets)-b.outlets) as missing_outlets,
   (select string_agg(ao.outlet_name,', ' order by ao.outlet_name) from active_outlets ao where not exists(
     select 1 from public.resale_listings rl where rl.asset_id=b.id and rl.outlet_id=ao.id and rl.status in ('Draft','Ready For Listing','Published','Reserved')
   )) as missing_outlet_names
  from base b
 )
 select c.id,c.sku,c.manufacturer,c.model,c.package_name,c.status,c.purchase_price,c.acquired_at,c.age_days,c.listings,c.outlets,c.outlet_names,c.available_outlets,c.missing_outlets,c.missing_outlet_names,
 case when c.listings=0 and c.status in ('Sent to Sales','Listed','Reserved') then 'NO ACTIVE LISTING' when c.age_days>=120 then 'AUCTION / EXIT REVIEW' when c.age_days>=90 then 'URGENT STRATEGY REVIEW' when c.age_days>=60 and c.missing_outlets>0 then 'EXPAND OUTLETS / PRICE REVIEW' when c.age_days>=60 then 'PRICE / PRESENTATION REVIEW' when c.age_days>=30 then 'REVIEW' else 'NORMAL' end,
 case when c.listings=0 and c.status in ('Sent to Sales','Listed','Reserved') then 'Open the Sales Workbench and create or restore at least one listing.' when c.age_days>=120 and c.missing_outlets>0 then 'Review for auction, clearance or another exit route; compare missing outlets before deciding. No automatic move is made.' when c.age_days>=120 then 'Review for auction, clearance, bundle or alternative exit route. No automatic move is made.' when c.age_days>=90 and c.missing_outlets>0 then 'Urgent review: reassess price and presentation, then consider the missing outlets shown.' when c.age_days>=90 then 'Urgent management review: reassess price, presentation and current outlet performance.' when c.age_days>=60 and c.missing_outlets>0 then 'Consider the missing active outlets and review asking price against current evidence.' when c.age_days>=60 then 'Review asking price and presentation against current evidence.' when c.age_days>=30 then 'Review listing performance and confirm current outlet strategy.' else 'Continue current strategy and monitor.' end
 from coverage c order by c.age_days desc,c.acquired_at asc;
end; $$;
revoke all on function public.management_stock_strategy_report() from public;
grant execute on function public.management_stock_strategy_report() to authenticated;
commit;