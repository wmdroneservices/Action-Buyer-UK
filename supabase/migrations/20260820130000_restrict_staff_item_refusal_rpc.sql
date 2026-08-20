revoke execute on function public.staff_refuse_quote_item(uuid, text) from public, anon;
grant execute on function public.staff_refuse_quote_item(uuid, text) to authenticated;
