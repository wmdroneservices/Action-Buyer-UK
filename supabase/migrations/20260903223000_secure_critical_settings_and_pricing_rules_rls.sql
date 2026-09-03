-- Secure the two previously unprotected critical public tables.
-- system_settings: no browser/Data API access.
-- quote_catalog_pricing_rules: active staff can read; purchasing staff can change rules.

alter table public.system_settings enable row level security;
alter table public.quote_catalog_pricing_rules enable row level security;

revoke all on table public.system_settings from anon, authenticated;
revoke all on table public.quote_catalog_pricing_rules from anon;
grant select, insert, update, delete on table public.quote_catalog_pricing_rules to authenticated;

drop policy if exists system_settings_no_client_access on public.system_settings;
create policy system_settings_no_client_access
on public.system_settings
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists quote_catalog_pricing_rules_staff_select on public.quote_catalog_pricing_rules;
create policy quote_catalog_pricing_rules_staff_select
on public.quote_catalog_pricing_rules
for select
to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.active = true
  )
);

drop policy if exists quote_catalog_pricing_rules_staff_insert on public.quote_catalog_pricing_rules;
create policy quote_catalog_pricing_rules_staff_insert
on public.quote_catalog_pricing_rules
for insert
to authenticated
with check (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.active = true
      and coalesce(s.can_access_purchasing,false) = true
  )
);

drop policy if exists quote_catalog_pricing_rules_staff_update on public.quote_catalog_pricing_rules;
create policy quote_catalog_pricing_rules_staff_update
on public.quote_catalog_pricing_rules
for update
to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.active = true
      and coalesce(s.can_access_purchasing,false) = true
  )
)
with check (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.active = true
      and coalesce(s.can_access_purchasing,false) = true
  )
);

drop policy if exists quote_catalog_pricing_rules_staff_delete on public.quote_catalog_pricing_rules;
create policy quote_catalog_pricing_rules_staff_delete
on public.quote_catalog_pricing_rules
for delete
to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid())
      and s.active = true
      and coalesce(s.can_access_purchasing,false) = true
  )
);