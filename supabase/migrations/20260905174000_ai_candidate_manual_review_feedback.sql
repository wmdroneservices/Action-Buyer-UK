-- Structured manual AI review feedback for Gemma learning.
create table if not exists public.quote_catalog_ai_candidate_review_feedback (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.quote_catalog_ai_candidates(id) on delete cascade,
  decision text not null check (decision in ('accepted','rejected')),
  review_mode text not null default 'manual' check (review_mode in ('manual','bulk')),
  review_reason text,
  reviewed_fields jsonb not null default '[]'::jsonb,
  changed_fields jsonb not null default '[]'::jsonb,
  before_values jsonb not null default '{}'::jsonb,
  after_values jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists quote_catalog_ai_candidate_review_feedback_candidate_idx
  on public.quote_catalog_ai_candidate_review_feedback(candidate_id,created_at desc);

alter table public.quote_catalog_ai_candidate_review_feedback enable row level security;
revoke all on table public.quote_catalog_ai_candidate_review_feedback from anon, authenticated;
grant select,insert on table public.quote_catalog_ai_candidate_review_feedback to authenticated;

drop policy if exists quote_catalog_ai_candidate_review_feedback_staff_select on public.quote_catalog_ai_candidate_review_feedback;
create policy quote_catalog_ai_candidate_review_feedback_staff_select
on public.quote_catalog_ai_candidate_review_feedback
for select to authenticated
using (exists (select 1 from public.staff_users s where s.user_id=(select auth.uid())));

drop policy if exists quote_catalog_ai_candidate_review_feedback_staff_insert on public.quote_catalog_ai_candidate_review_feedback;
create policy quote_catalog_ai_candidate_review_feedback_staff_insert
on public.quote_catalog_ai_candidate_review_feedback
for insert to authenticated
with check (exists (select 1 from public.staff_users s where s.user_id=(select auth.uid())));

create or replace function public.record_ai_candidate_manual_review(
  p_candidate_id uuid,
  p_decision text,
  p_reason text default null,
  p_reviewed_fields jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  c public.quote_catalog_ai_candidates%rowtype;
  v_manufacturer text;
  v_product_type text;
  v_before jsonb;
  v_after jsonb;
  v_changed jsonb := '[]'::jsonb;
  v_reviewed jsonb := coalesce(p_reviewed_fields,'[]'::jsonb);
  v_fields jsonb;
  v_field text;
  v_feedback_id uuid;
  v_learning_key text;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_effective_category text;
begin
  if not exists (select 1 from public.staff_users s where s.user_id=(select auth.uid())) then
    raise exception 'Staff access required';
  end if;
  if p_decision not in ('accepted','rejected') then
    raise exception 'Decision must be accepted or rejected';
  end if;

  select * into c from public.quote_catalog_ai_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;

  select p.manufacturer,p.product_type into v_manufacturer,v_product_type
  from public.quote_catalog_products p where p.id=c.catalog_product_id;

  v_before := jsonb_build_object(
    'price',c.price,'url',c.source_url,'condition',c.condition,'title',c.discovered_title,
    'evidence_bucket',coalesce(c.evidence_category,c.price_type),'availability',c.availability_status,
    'package',c.package_match,'variant',c.variant_match,'match_confidence',c.match_confidence,'source',c.source_kind
  );
  v_after := jsonb_build_object(
    'price',coalesce(c.edited_price,c.price),'url',coalesce(c.edited_source_url,c.source_url),
    'condition',coalesce(c.edited_condition,c.condition),'title',coalesce(c.edited_title,c.discovered_title),
    'evidence_bucket',coalesce(c.edited_evidence_category,c.evidence_category,c.price_type),
    'availability',coalesce(c.edited_availability_status,c.availability_status),
    'package',coalesce(c.edited_package_match,c.package_match),'variant',coalesce(c.edited_variant_match,c.variant_match),
    'match_confidence',coalesce(c.edited_match_confidence,c.match_confidence),'source',coalesce(c.edited_source_kind,c.source_kind)
  );

  select coalesce(jsonb_agg(k.key order by k.key),'[]'::jsonb) into v_changed
  from jsonb_each(v_before) k where k.value is distinct from v_after -> k.key;

  select coalesce(jsonb_agg(distinct x.value),'[]'::jsonb) into v_reviewed
  from jsonb_array_elements_text(coalesce(v_reviewed,'[]'::jsonb)) x(value)
  where x.value in ('price','url','condition','product_match','package_variant','evidence_bucket','availability','source');

  if p_decision='rejected' and v_reason is null then
    raise exception 'A reason is required when manually denying a finding';
  end if;
  if jsonb_array_length(v_changed)>0 and v_reason is null then
    raise exception 'Explain why the changed evidence was corrected so the AI can learn from the review';
  end if;

  update public.quote_catalog_ai_candidates
  set decision=p_decision,
      decision_reason=coalesce(v_reason,case when p_decision='accepted'
        then 'Manual review accepted with no value correction reason required.' else 'Manual review decision.' end),
      reviewed_at=now(),reviewed_by=(select auth.uid())
  where id=p_candidate_id;

  insert into public.quote_catalog_ai_candidate_review_feedback(
    candidate_id,decision,review_mode,review_reason,reviewed_fields,changed_fields,before_values,after_values,reviewed_by
  )
  values(p_candidate_id,p_decision,'manual',v_reason,v_reviewed,v_changed,v_before,v_after,(select auth.uid()))
  returning id into v_feedback_id;

  select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into v_fields
  from (
    select value from jsonb_array_elements_text(v_reviewed)
    union
    select value from jsonb_array_elements_text(v_changed)
  ) f;

  v_effective_category := coalesce(c.edited_evidence_category,c.evidence_category,c.price_type);

  for v_field in select value from jsonb_array_elements_text(v_fields) loop
    v_learning_key := lower(coalesce(nullif(v_manufacturer,''),'any'))||'|'||
      lower(coalesce(nullif(v_product_type,''),'any'))||'|'||p_decision||'|'||v_field;

    insert into public.quote_catalog_ai_learning(
      manufacturer,product_type,evidence_category,learning_type,learning_key,learning_value,confidence,active,created_at,updated_at
    )
    values(
      v_manufacturer,v_product_type,v_effective_category,'manual_review_feedback',v_learning_key,
      jsonb_build_object(
        'manufacturer',v_manufacturer,'product_type',v_product_type,'decision',p_decision,'field',v_field,
        'reason',v_reason,'before',v_before -> v_field,'after',v_after -> v_field,
        'candidate_id',p_candidate_id,'feedback_id',v_feedback_id,'count',1,'reviewed_at',now()
      ),
      case when p_decision='accepted' then 0.85 else 0.95 end,true,now(),now()
    )
    on conflict (learning_type,learning_key) do update
    set manufacturer=excluded.manufacturer,product_type=excluded.product_type,evidence_category=excluded.evidence_category,
        learning_value=jsonb_build_object(
          'manufacturer',excluded.learning_value->'manufacturer','product_type',excluded.learning_value->'product_type',
          'decision',excluded.learning_value->'decision','field',excluded.learning_value->'field',
          'reason',excluded.learning_value->'reason','before',excluded.learning_value->'before','after',excluded.learning_value->'after',
          'candidate_id',excluded.learning_value->'candidate_id','feedback_id',excluded.learning_value->'feedback_id',
          'count',coalesce((public.quote_catalog_ai_learning.learning_value->>'count')::integer,0)+1,
          'reviewed_at',excluded.learning_value->'reviewed_at'
        ),
        confidence=greatest(public.quote_catalog_ai_learning.confidence,excluded.confidence),active=true,updated_at=now();
  end loop;

  return jsonb_build_object(
    'candidate_id',p_candidate_id,'decision',p_decision,'feedback_id',v_feedback_id,
    'reviewed_fields',v_reviewed,'changed_fields',v_changed
  );
end;
$$;

grant execute on function public.record_ai_candidate_manual_review(uuid,text,text,jsonb) to authenticated;
