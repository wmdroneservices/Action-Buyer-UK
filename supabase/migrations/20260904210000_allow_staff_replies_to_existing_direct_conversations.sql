-- Allow replies to an existing direct staff conversation without requiring a reverse
-- "start conversation" permission. Explicit permissions remain required to initiate
-- a brand-new direct conversation.

create or replace function public.staff_send_direct_message(p_recipient_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_id uuid;
begin
  if not public.messaging_is_active_staff() then
    raise exception 'Active staff access required';
  end if;

  if p_recipient_id=auth.uid() then
    raise exception 'You cannot message yourself';
  end if;

  if not exists(
    select 1 from public.staff_users
    where user_id=p_recipient_id and active=true
  ) then
    raise exception 'Recipient is not an active staff account';
  end if;

  if not public.messaging_is_staff_manager()
     and not exists(
       select 1 from public.staff_message_permissions
       where sender_id=auth.uid() and recipient_id=p_recipient_id
     )
     and not exists(
       select 1 from public.staff_messages
       where sender_id=p_recipient_id and recipient_id=auth.uid()
     )
  then
    raise exception 'You are not authorised to start a conversation with this staff member';
  end if;

  insert into public.staff_messages(sender_id,recipient_id,body)
  values(auth.uid(),p_recipient_id,trim(p_body))
  returning id into v_id;

  return v_id;
end
$$;