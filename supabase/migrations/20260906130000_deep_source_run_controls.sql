-- Targeted cancellation for one Deep Source/AI research run, plus completion guard.
create or replace function public.ai_research_cancel_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_queue_stopped integer := 0;
  v_status text;
begin
  if not exists (
    select 1 from public.staff_users s
    where s.user_id = auth.uid() and s.active = true
  ) then
    raise exception 'Active staff access required';
  end if;

  select status into v_status
  from public.quote_catalog_ai_research_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Unknown research run';
  end if;

  if v_status in ('completed','completed_with_errors','cancelled') then
    return jsonb_build_object(
      'run_id', p_run_id,
      'already_terminal', true,
      'queue_items_stopped', 0,
      'status', v_status
    );
  end if;

  with affected as (
    update public.quote_catalog_ai_queue
    set status = 'skipped',
        updated_at = now()
    where run_id = p_run_id
      and status in ('queued','claimed','processing')
    returning id
  )
  select count(*)::integer into v_queue_stopped from affected;

  update public.quote_catalog_ai_research_runs
  set status = 'cancelled',
      finished_at = now(),
      notes = trim(
        coalesce(notes,'') ||
        case when coalesce(notes,'') = '' then '' else ' | ' end ||
        'cancelled from Deep Source Audit controls'
      )
  where id = p_run_id;

  return jsonb_build_object(
    'run_id', p_run_id,
    'already_terminal', false,
    'queue_items_stopped', v_queue_stopped,
    'status', 'cancelled',
    'cancelled_at', now()
  );
end
$$;

create or replace function public.ai_research_complete_queue_item(
  p_queue_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  -- A cancelled run marks its active item SKIPPED. A worker that finishes a few
  -- moments later must never resurrect that item to COMPLETED/FAILED.
  update public.quote_catalog_ai_queue
  set status = case when p_success then 'completed' else 'failed' end,
      completed_at = now(),
      finished_at = now(),
      last_error = case when p_success then null else p_error end
  where id = p_queue_id
    and status in ('processing','claimed');
end
$$;

revoke all on function public.ai_research_cancel_run(uuid) from public, anon;
grant execute on function public.ai_research_cancel_run(uuid) to authenticated;
