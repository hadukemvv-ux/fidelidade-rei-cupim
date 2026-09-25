begin;

-- O saldo exibido ao cliente e usado nos resgates mora nesta coluna.
-- Extratos legados não reconstituem os saldos importados de abertura.
create or replace function public.saldo_pontos_cadastrados()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(pontos), 0)::bigint
  from public.base_clientes_saipos;
$$;

revoke all on function public.saldo_pontos_cadastrados()
  from public, anon, authenticated;
grant execute on function public.saldo_pontos_cadastrados()
  to service_role;

commit;
