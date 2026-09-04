-- Monitor research websites that are not yet live and automatically activate them
-- for market evidence once their public storefront opens.

alter table public.quote_catalog_ai_sources
  add column if not exists site_status text not null default 'live',
  add column if not exists monitor_for_opening boolean not null default false,
  add column if not exists opening_soon_detected_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists last_status_checked_at timestamptz,
  add column if not exists status_note text;

alter table public.quote_catalog_ai_sources
  drop constraint if exists quote_catalog_ai_sources_site_status_chk;

alter table public.quote_catalog_ai_sources
  add constraint quote_catalog_ai_sources_site_status_chk
  check (site_status in ('live','opening_soon','unknown','blocked'));

-- Autelpilot UK currently presents an "Opening soon" storefront. Keep it out of
-- pricing evidence until the storefront is publicly live, but monitor it and
-- automatically record the transition date when that happens.
update public.quote_catalog_ai_sources
set
  source_name='Autelpilot UK',
  country_code='GB',
  source_kind='retailer',
  enabled=false,
  priority=25,
  homepage_url='https://autelpilot.co.uk/',
  research_scope='new_uk',
  site_status='opening_soon',
  monitor_for_opening=true,
  opening_soon_detected_at=coalesce(opening_soon_detected_at,now()),
  status_note='Public UK storefront currently shows "Opening soon". Do not use for pricing evidence until a live storefront is detected.'
where lower(domain)='autelpilot.co.uk';

insert into public.quote_catalog_ai_sources (
  source_name,domain,country_code,source_kind,enabled,priority,notes,
  homepage_url,research_scope,site_status,monitor_for_opening,
  opening_soon_detected_at,status_note,discovery_status
)
select
  'Autelpilot UK','autelpilot.co.uk','GB','retailer',false,25,
  'UK Autel retailer/storefront currently opening soon. Automatically monitored and enabled only after a live storefront is detected.',
  'https://autelpilot.co.uk/','new_uk','opening_soon',true,
  now(),'Public UK storefront currently shows "Opening soon". Do not use for pricing evidence until a live storefront is detected.','approved'
where not exists (
  select 1 from public.quote_catalog_ai_sources where lower(domain)='autelpilot.co.uk'
);
