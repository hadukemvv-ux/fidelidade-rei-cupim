begin;

-- O aplicativo acessa estas tabelas somente pelo backend com service_role.
-- Sem policies públicas, anon/authenticated ficam bloqueados por padrão.
do $$
declare
  table_name text;
  protected_tables text[] := array[
    'base_clientes_saipos',
    'produtos_loja',
    'sorteios',
    'sorteios_logs',
    'sorteios_eventos',
    'vendas_processadas',
    'saipos_pedidos_processados',
    'saipos_cron_logs',
    'extrato_pontos',
    'creditos_qr',
    'resgates',
    'garcons',
    'garcons_logs',
    'historico_roleta',
    'sorteios_ganhadores',
    'cupons_resgatados'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end;
$$;

-- A view deixa de herdar privilégios do criador e não fica disponível pela API pública.
do $$
begin
  if to_regclass('public.view_saldo_clientes') is not null then
    execute 'alter view public.view_saldo_clientes set (security_invoker = true)';
    execute 'revoke all on table public.view_saldo_clientes from anon, authenticated';
  end if;
end;
$$;

-- Índice recomendado pelo advisor para a chave estrangeira existente.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'historico_roleta'
      and column_name = 'garcom_id'
  ) then
    execute 'create index if not exists historico_roleta_garcom_id_idx on public.historico_roleta(garcom_id)';
  end if;
end;
$$;

commit;
