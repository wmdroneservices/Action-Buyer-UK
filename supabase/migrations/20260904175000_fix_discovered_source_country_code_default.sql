-- Prevent automatically discovered research sources from failing when the AI
-- does not know the source country yet. The source is still disabled pending review;
-- GB is a safe non-null default for the current UK catalogue workflow.

create or replace function public.ai_research_register_discovered_source(
  p_source_url text,
  p_source_name text default null,
  p_country_code text default null,
  p_source_kind text default 'other',
  p_research_scope text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_domain text;
  v_name text;
  v_id uuid;
  v_kind text;
  v_country_code text;
begin
  if p_source_url is null or btrim(p_source_url) = '' then
    raise exception 'A source URL is required';
  end if;

  v_domain := lower(regexp_replace(regexp_replace(split_part(regexp_replace(p_source_url, '^https?://', ''), '/', 1), '^www\\.', ''), ':.*$', ''));
  if v_domain = '' then
    raise exception 'Could not determine source domain';
  end if;

  select id into v_id
  from public.quote_catalog_ai_sources
  where lower(domain) = v_domain
  limit 1;

  if v_id is not null then
    update public.quote_catalog_ai_sources
    set discovery_count = coalesce(discovery_count,0) + 1,
        last_verified_at = now()
    where id = v_id;
    return v_id;
  end if;

  v_kind := case
    when p_source_kind in ('manufacturer','retailer','marketplace','used_dealer','auction','other') then p_source_kind
    else 'other'
  end;

  v_country_code := coalesce(upper(nullif(btrim(p_country_code),'')), 'GB');

  v_name := nullif(btrim(coalesce(p_source_name,'')),'');
  if v_name is null then
    v_name := v_domain;
  end if;

  insert into public.quote_catalog_ai_sources (
    source_name, domain, country_code, source_kind, enabled, priority, notes,
    homepage_url, research_scope, discovered_at, discovery_count, discovery_status
  )
  values (
    v_name, v_domain, v_country_code, v_kind,
    false, 100, coalesce(p_notes,'Automatically discovered during AI product research; pending source approval.'),
    regexp_replace(p_source_url, '(https?://[^/]+).*', '\\1') || '/',
    nullif(btrim(p_research_scope),''),
    now(), 1, 'discovered'
  )
  returning id into v_id;

  return v_id;
exception when unique_violation then
  select id into v_id from public.quote_catalog_ai_sources where lower(domain)=v_domain limit 1;
  update public.quote_catalog_ai_sources
  set discovery_count = coalesce(discovery_count,0) + 1,
      last_verified_at = now()
  where id = v_id;
  return v_id;
end;
$$;
