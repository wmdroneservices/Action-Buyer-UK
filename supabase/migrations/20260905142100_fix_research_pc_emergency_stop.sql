-- Fix full Research PC emergency stop and allow dashboard start commands.
create or replace function public.ai_agent_request_command(
  p_agent_id text,
  p_command text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare rid uuid;
begin
  if p_command not in ('check_status','check_ollama','start_worker','restart_worker','stop_worker') then
    raise exception 'Unsupported command';
  end if;
  insert into public.quote_catalog_ai_agent_commands(agent_id,command,requested_by)
  values(p_agent_id,p_command,auth.uid()) returning id into rid;
  return jsonb_build_object('id',rid,'agent_id',p_agent_id,'command',p_command,'status','queued');
end
$$;

create or replace function public.ai_research_emergency_stop()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_queue_cleared integer := 0;
  v_runs_checked integer := 0;
begin
  update public.quote_catalog_ai_continuous_control
  set enabled=false,stopped_at=now(),updated_at=now()
  where id=true and enabled=true;

  with affected as (
    update public.quote_catalog_ai_queue
    set status='skipped',updated_at=now()
    where status in ('queued','claimed','processing')
    returning run_id
  )
  select count(*)::integer,count(distinct run_id)::integer
  into v_queue_cleared,v_runs_checked
  from affected;

  update public.quote_catalog_ai_research_runs r
  set status='cancelled',
      finished_at=now(),
      notes=trim(coalesce(r.notes,'') || case when coalesce(r.notes,'')='' then '' else ' | ' end || 'emergency stop')
  where r.id in (select distinct q.run_id from public.quote_catalog_ai_queue q where q.status='skipped')
    and r.status in ('queued','running');

  return jsonb_build_object('queue_items_stopped',v_queue_cleared,'continuous_disabled',true,'runs_checked',v_runs_checked,'stopped_at',now());
end
$$;
