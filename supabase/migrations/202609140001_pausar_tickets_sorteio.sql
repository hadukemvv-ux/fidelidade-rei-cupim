begin;

-- Decisão de produto e conformidade: o Clube permanece com pontos, cashback
-- e benefícios definidos. Tickets não representam promessa de participação
-- futura e não podem continuar sendo acumulados enquanto não existir uma
-- campanha formalmente desenhada.
create or replace function public.creditar_venda_fidelidade(
  p_cliente_id bigint,
  p_id_sale bigint,
  p_valor numeric,
  p_ocorreu_em timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente public.base_clientes_saipos%rowtype;
  v_gasto_anterior numeric;
  v_gasto_depois numeric;
  v_nivel_antes text;
  v_nivel_depois text;
  v_pontos_mult integer;
  v_cashback_taxa numeric;
  v_pontos integer;
  v_cashback numeric;
begin
  if p_valor <= 0 then raise exception 'Valor elegível deve ser positivo'; end if;

  insert into public.saipos_pedidos_processados(id_sale)
  values (p_id_sale)
  on conflict (id_sale) do nothing;
  if not found then return jsonb_build_object('duplicada', true); end if;

  select * into v_cliente
  from public.base_clientes_saipos
  where id = p_cliente_id
  for update;
  if not found then raise exception 'Cliente não encontrado'; end if;

  v_gasto_anterior := coalesce(v_cliente.gasto_90_dias, v_cliente.total_gasto, 0);
  v_gasto_depois := v_gasto_anterior + p_valor;

  if v_gasto_anterior >= 500 then
    v_nivel_antes := 'rei'; v_pontos_mult := 7; v_cashback_taxa := .03;
  elsif v_gasto_anterior >= 250 then
    v_nivel_antes := 'ouro'; v_pontos_mult := 4; v_cashback_taxa := .01;
  elsif v_gasto_anterior >= 100 then
    v_nivel_antes := 'prata'; v_pontos_mult := 2; v_cashback_taxa := .005;
  else
    v_nivel_antes := 'bronze'; v_pontos_mult := 1; v_cashback_taxa := 0;
  end if;

  v_nivel_depois := case
    when v_gasto_depois >= 500 then 'rei'
    when v_gasto_depois >= 250 then 'ouro'
    when v_gasto_depois >= 100 then 'prata'
    else 'bronze' end;
  v_pontos := floor(p_valor * v_pontos_mult);
  v_cashback := round(p_valor * v_cashback_taxa, 2);

  update public.base_clientes_saipos set
    nivel = v_nivel_depois,
    pontos = coalesce(pontos, 0) + v_pontos,
    cashback = coalesce(cashback, 0) + v_cashback,
    total_gasto = coalesce(total_gasto, 0) + p_valor,
    gasto_90_dias = v_gasto_depois,
    qtd_pedidos = coalesce(qtd_pedidos, 0) + 1,
    ultima_compra = p_ocorreu_em,
    atualizado_em = now(),
    nivel_calculado_em = now()
  where id = p_cliente_id;

  insert into public.fidelidade_transacoes(
    id_sale, cliente_id, valor_elegivel, nivel_antes, nivel_depois,
    pontos_gerados, cashback_gerado, tickets_gerados, ocorreu_em
  ) values (
    p_id_sale::text, p_cliente_id, p_valor, v_nivel_antes, v_nivel_depois,
    v_pontos, v_cashback, 0, p_ocorreu_em
  );

  return jsonb_build_object(
    'duplicada', false, 'nivel_antes', v_nivel_antes, 'nivel_depois', v_nivel_depois,
    'pontos', v_pontos, 'cashback', v_cashback, 'tickets', 0,
    'gasto_90_dias', v_gasto_depois
  );
end;
$$;

revoke all on function public.creditar_venda_fidelidade(bigint,bigint,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.creditar_venda_fidelidade(bigint,bigint,numeric,timestamptz) to service_role;

comment on column public.base_clientes_saipos.tickets is
  'Saldo legado congelado em 14/09/2026. Não representa participação, campanha ou promessa de sorteio futuro.';

commit;
