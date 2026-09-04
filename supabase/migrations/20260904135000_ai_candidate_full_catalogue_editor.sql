-- Full inline catalogue-style editor for AI research findings.
alter table public.quote_catalog_ai_candidates
  add column if not exists edited_evidence_category text,
  add column if not exists edited_availability_status text,
  add column if not exists edited_package_match text,
  add column if not exists edited_variant_match text,
  add column if not exists edited_match_confidence numeric,
  add column if not exists edited_source_kind text,
  add column if not exists edited_evidence_notes text;

create or replace function public.apply_accepted_ai_candidate(p_candidate_id uuid)
returns uuid language plpgsql security invoker as $$
declare
  c public.quote_catalog_ai_candidates%rowtype;
  evidence_id uuid;
begin
  select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  if c.decision <> 'accepted' then raise exception 'Candidate must be accepted before applying'; end if;

  insert into public.quote_catalog_retailer_prices
    (catalog_product_id,retailer,condition,sell_price,checked_at,source_url,notes)
  values
    (
      c.catalog_product_id,
      coalesce(c.edited_source_kind,c.source_kind,'AI reviewed source'),
      coalesce(c.edited_condition,c.condition,'Unknown'),
      coalesce(c.edited_price,c.price),
      now(),
      coalesce(c.edited_source_url,c.source_url),
      concat(
        'AI-reviewed evidence | ',
        coalesce(c.edited_evidence_category,c.evidence_category,c.price_type,'Unclassified'),
        ' | ',
        coalesce(c.edited_title,c.discovered_title,''),
        case when coalesce(c.edited_availability_status,c.availability_status) is not null then ' | Availability: '||coalesce(c.edited_availability_status,c.availability_status) else '' end,
        case when coalesce(c.edited_package_match,c.package_match) is not null then ' | Package: '||coalesce(c.edited_package_match,c.package_match) else '' end,
        case when coalesce(c.edited_variant_match,c.variant_match) is not null then ' | Variant: '||coalesce(c.edited_variant_match,c.variant_match) else '' end,
        case when coalesce(c.edited_evidence_notes,c.evidence_notes) is not null then ' | Notes: '||coalesce(c.edited_evidence_notes,c.evidence_notes) else '' end
      )
    )
  on conflict do nothing
  returning id into evidence_id;

  update public.quote_catalog_ai_candidates
  set applied_at=now(), applied_evidence_id=evidence_id
  where id=p_candidate_id;

  return evidence_id;
end;
$$;

grant execute on function public.apply_accepted_ai_candidate(uuid) to authenticated;
