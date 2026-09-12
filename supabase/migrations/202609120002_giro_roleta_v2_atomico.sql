begin;

-- A V2 começa sempre em modo de teste. A publicação e a saída de teste são
-- decisões explícitas de operação, nunca consequência de um deploy.
alter table public.roleta_configuracoes
  add column if not exists v2_modo_teste boolean not null default true;

create or replace function public.girar_roleta_v2(
  p_token_hash text,
  p_telefone_hash text,
  p_cliente_id bigint,
  p_consentimento_marketing boolean,
  p_consentimento_versao text,
  p_origem_consentimento text,
  p_ip_hash text,
  p_aleatorio numeric,
  p_codigo_hash text,
  p_codigo_final text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.roleta_configuracoes%rowtype;
  v_sessao public.roleta_sessoes%rowtype;
  v_premio public.premios_roleta%rowtype;
  v_total numeric := 0;
  v_alvo numeric := 0;
  v_acumulado numeric := 0;
  v_peso numeric := 0;
  v_cupom_id uuid;
  v_expira_em timestamptz;
begin
  if p_aleatorio < 0 or p_aleatorio >= 1 then
    return jsonb_build_object('ok', false, 'motivo', 'Aleatoriedade inválida.');
  end if;

  select * into v_config from public.roleta_configuracoes where id = 1;
  if not found or not v_config.v2_publicada then
    return jsonb_build_object('ok', false, 'motivo', 'A Roleta V2 ainda não está disponível.');
  end if;

  select * into v_sessao
  from public.roleta_sessoes
  where token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'QR inválido.');
  end if;

  if v_sessao.expira_em <= now() then
    update public.roleta_sessoes
      set status = 'expirada'
      where id = v_sessao.id and status in ('criada', 'aberta');
    return jsonb_build_object('ok', false, 'motivo', 'Este QR expirou. Peça um novo à equipe.');
  end if;

  if v_sessao.status not in ('criada', 'aberta') then
    return jsonb_build_object('ok', false, 'motivo', 'Este QR já foi utilizado ou não está disponível.');
  end if;

  select coalesce(sum(greatest(0, coalesce(pesos_nivel[v_sessao.nivel], 0))), 0)
  into v_total
  from public.premios_roleta
  where versao = 2 and ativo and coalesce(participa_roleta, true);

  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'A roleta ainda não possui prêmios ativos.');
  end if;

  v_alvo := p_aleatorio * v_total;
  for v_premio in
    select *
    from public.premios_roleta
    where versao = 2 and ativo and coalesce(participa_roleta, true)
    order by id
  loop
    v_peso := greatest(0, coalesce(v_premio.pesos_nivel[v_sessao.nivel], 0));
    v_acumulado := v_acumulado + v_peso;
    if v_alvo < v_acumulado then exit; end if;
  end loop;

  if v_premio.id is null then
    return jsonb_build_object('ok', false, 'motivo', 'Não foi possível definir o prêmio.');
  end if;

  v_expira_em := now() + make_interval(days => v_premio.expira_em_dias);
  insert into public.cupons_promocionais(
    codigo_hash, codigo_final, cliente_id, telefone_hash, tipo_premio, canal_uso,
    status, modo_teste, valor_desconto_percentual, custo_estimado,
    dias_semana_validos, nao_valido_feriado, origem, referencia_origem, expira_em,
    detalhes
  ) values (
    p_codigo_hash, p_codigo_final, p_cliente_id, p_telefone_hash, v_premio.tipo,
    v_premio.canal_uso, case when v_config.v2_modo_teste then 'teste' else 'emitido' end,
    v_config.v2_modo_teste,
    case when v_premio.tipo in ('desconto_presencial_10', 'desconto_delivery_10') then 10 else null end,
    v_premio.custo_estimado, v_premio.dias_semana_validos, true, 'roleta_v2',
    v_sessao.id, v_expira_em,
    jsonb_build_object('premio_id', v_premio.id, 'nivel', v_sessao.nivel, 'valor_comanda', v_sessao.valor_comanda)
  ) returning id into v_cupom_id;

  insert into public.roleta_giros(
    sessao_id, cliente_id, telefone_hash, consentimento_marketing,
    consentimento_versao, premio_id, cupom_id, aleatorio
  ) values (
    v_sessao.id, p_cliente_id, p_telefone_hash, p_consentimento_marketing,
    p_consentimento_versao, v_premio.id, v_cupom_id, p_aleatorio
  );

  insert into public.consentimentos_marketing(
    cliente_id, telefone_hash, finalidade, concedido, texto_versao, canal, origem, ip_hash
  ) values (
    p_cliente_id, p_telefone_hash, 'marketing_promocoes', p_consentimento_marketing,
    coalesce(p_consentimento_versao, v_config.texto_consentimento_versao),
    'whatsapp', p_origem_consentimento, p_ip_hash
  );

  insert into public.cupom_eventos(cupom_id, acao, origem, detalhes)
  values (v_cupom_id, 'emitido', 'roleta_v2', jsonb_build_object('sessao_id', v_sessao.id, 'premio_id', v_premio.id));

  update public.roleta_sessoes
  set status = 'girada', girada_em = now()
  where id = v_sessao.id;

  return jsonb_build_object(
    'ok', true,
    'premio', jsonb_build_object(
      'nome', v_premio.nome,
      'descricao_vitoria', v_premio.descricao_vitoria,
      'emoji', v_premio.emoji,
      'canal_uso', v_premio.canal_uso
    ),
    'cupom_id', v_cupom_id,
    'expira_em', v_expira_em,
    'modo_teste', v_config.v2_modo_teste
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Este QR já foi utilizado.');
end;
$$;

revoke all on function public.girar_roleta_v2(text, text, bigint, boolean, text, text, text, numeric, text, text) from public, anon, authenticated;

commit;
