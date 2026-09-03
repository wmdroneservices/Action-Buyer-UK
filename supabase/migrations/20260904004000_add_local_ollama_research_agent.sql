-- Local Ollama research agent heartbeat and safe queue claiming.

create table if not exists public.quote_catalog_ai_agents (
  agent_id text primary key,
  agent_name text not null,
  status text not null default 'offline',
  provider text not null default 'ollama',
  model text,
  version text,
  last_heartbeat_at timestamptz,
  last_started_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quote_catalog_ai_agents enable row level security;

drop policy if exists "staff read ai agents" on public.quote_catalog_ai_agents;
create policy "staff read ai agents" on public.quote_catalog_ai_agents
for select to authenticated
using (exists (
  select 1 from public.staff_users s
  where s.user_id=auth.uid() and s.active=true
));

create or replace function public.ai_research_claim_next_queue_item()
returns table(queue_id uuid,run_id uuid,catalog_product_id uuid)
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  select q.id into v_id
  from public.quote_catalog_ai_queue q
  where q.status='queued' and coalesce(q.available_at,now())<=now()
  order by q.priority desc,q.created_at
  for update skip locked
  limit 1;

  if v_id is null then return; end if;

  update public.quote_catalog_ai_queue
  set status='processing',claimed_at=now(),attempts=coalesce(attempts,0)+1
  where id=v_id;

  return query
  select q.id,q.run_id,q.catalog_product_id
  from public.quote_catalog_ai_queue q where q.id=v_id;
end $$;

revoke all on function public.ai_research_claim_next_queue_item() from public,anon,authenticated;
grant execute on function public.ai_research_claim_next_queue_item() to service_role;