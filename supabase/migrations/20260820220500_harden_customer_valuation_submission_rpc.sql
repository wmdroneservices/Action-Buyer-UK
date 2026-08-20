alter function public.save_customer_valuation(jsonb,jsonb) set search_path = '';
revoke execute on function public.save_customer_valuation(jsonb,jsonb) from public, anon;
grant execute on function public.save_customer_valuation(jsonb,jsonb) to authenticated;
