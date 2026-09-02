begin;

create or replace function public.resgatar_beneficio_fidelidade(
  p_telefone text,
  p_tipo text,
  p_custo_pontos integer,
  p_custo_cash numeric,
  p_premio_nome text,
  p_codigo text,
  p_produto_id bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente public.base_clientes_saipos%rowtype;
  v_resgate_id public.resgates.id%type;
begin
  if p_tipo not in ('frete', 'cashback', 'pontos', 'produto') then
    raise exception 'Tipo de resgate inválido';
  end if;
  if coalesce(p_custo_pontos, 0) < 0 or coalesce(p_custo_cash, 0) < 0 then
    raise exception 'Custo de resgate inválido';
  end if;
  if coalesce(p_custo_pontos, 0) = 0 and coalesce(p_custo_cash, 0) = 0 then
    raise exception 'Resgate sem custo não é permitido';
  end if;

  select * into v_cliente
  from public.base_clientes_saipos
  where telefone = p_telefone
  for update;

  if not found then raise exception 'Cliente não encontrado'; end if;

  if exists (
    select 1 from public.resgates
    where telefone = p_telefone
      and criado_em >= date_trunc('day', now())
      and criado_em < date_trunc('day', now()) + interval '1 day'
  ) then
    raise exception 'Limite de 1 resgate por dia atingido';
  end if;

  if coalesce(v_cliente.pontos, 0) < coalesce(p_custo_pontos, 0) then
    raise exception 'Saldo de pontos insuficiente';
  end if;
  if coalesce(v_cliente.cashback, 0) < coalesce(p_custo_cash, 0) then
    raise exception 'Saldo de cashback insuficiente';
  end if;

  update public.base_clientes_saipos set
    pontos = coalesce(pontos, 0) - coalesce(p_custo_pontos, 0),
    cashback = coalesce(cashback, 0) - coalesce(p_custo_cash, 0),
    atualizado_em = now()
  where id = v_cliente.id;

  insert into public.resgates(
    telefone, tipo, valor, premio_nome, codigo, criado_em, status, produto_id
  ) values (
    p_telefone,
    p_tipo,
    case when coalesce(p_custo_cash, 0) > 0 then p_custo_cash else p_custo_pontos end,
    p_premio_nome,
    p_codigo,
    now(),
    'processado',
    p_produto_id
  ) returning id into v_resgate_id;

  insert into public.auditoria_fidelidade(
    cliente_id, acao, entidade, entidade_id, detalhes
  ) values (
    v_cliente.id,
    'resgate_criado',
    'resgate',
    v_resgate_id::text,
    jsonb_build_object(
      'codigo', p_codigo,
      'tipo', p_tipo,
      'pontos', coalesce(p_custo_pontos, 0),
      'cashback', coalesce(p_custo_cash, 0)
    )
  );

  return jsonb_build_object(
    'resgate_id', v_resgate_id,
    'codigo', p_codigo,
    'pontos', coalesce(v_cliente.pontos, 0) - coalesce(p_custo_pontos, 0),
    'cashback', coalesce(v_cliente.cashback, 0) - coalesce(p_custo_cash, 0)
  );
end;
$$;

revoke all on function public.resgatar_beneficio_fidelidade(text,text,integer,numeric,text,text,bigint)
  from public, anon, authenticated;
grant execute on function public.resgatar_beneficio_fidelidade(text,text,integer,numeric,text,text,bigint)
  to service_role;

commit;
