-- Prepared only: deploy before the PUT using this RPC. No catalog/gate changes.
begin;
create function public.atualizar_premio_roleta(p_premio_id bigint, p_actor_id uuid, p_alteracoes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.perfis_operacionais%rowtype;
  v_antes public.premios_roleta%rowtype;
  v_depois public.premios_roleta%rowtype;
  v_teste boolean;
  v_key text;
  v_value jsonb;
  v_campos jsonb;
  v_allowed constant text[] := array['nome','descricao_vitoria','emoji','probabilidade','ativo','valor',
    'participa_roleta','canal_uso','custo_estimado','expira_em_dias','pesos_nivel','descricao_operacional'];
begin
  select * into v_actor from public.perfis_operacionais
    where user_id = p_actor_id and ativo and papel = 'superadmin' for share;
  if not found then return jsonb_build_object('ok',false,'code','forbidden','motivo','Sem permissão para editar prêmios.'); end if;
  perform 1 from public.seguranca_configuracoes where id = 1 and not modo_contencao for share;
  if not found then return jsonb_build_object('ok',false,'code','paused','motivo','Operação pausada.'); end if;
  if p_premio_id is null or p_premio_id <= 0 or p_alteracoes is null
    or jsonb_typeof(p_alteracoes) <> 'object' or p_alteracoes = '{}'::jsonb then
    return jsonb_build_object('ok',false,'code','invalid','motivo','Alteração inválida.'); end if;
  for v_key, v_value in select * from jsonb_each(p_alteracoes) loop
    if not (v_key = any(v_allowed)) then
      return jsonb_build_object('ok',false,'code','invalid','motivo','Campo não permitido.'); end if;
    if (v_key in ('nome','emoji','canal_uso') and jsonb_typeof(v_value) <> 'string')
      or (v_key in ('descricao_vitoria','descricao_operacional') and jsonb_typeof(v_value) not in ('string','null'))
      or (v_key in ('ativo','participa_roleta') and jsonb_typeof(v_value) <> 'boolean')
      or (v_key in ('probabilidade','valor','custo_estimado','expira_em_dias') and jsonb_typeof(v_value) <> 'number')
      or (v_key = 'pesos_nivel' and jsonb_typeof(v_value) <> 'array') then
      return jsonb_build_object('ok',false,'code','invalid','motivo','Valor inválido.'); end if;
    if (v_key in ('probabilidade','expira_em_dias') and (v_value::text !~ '^[0-9]+$' or (v_value::text)::numeric > 100000))
      or (v_key in ('valor','custo_estimado') and (v_value::text)::numeric not between 0 and 9999999999.99) then
      return jsonb_build_object('ok',false,'code','invalid','motivo','Valor inválido.'); end if;
    if v_key = 'pesos_nivel' then
      if jsonb_array_length(v_value) <> 6 or exists (select 1 from jsonb_array_elements(v_value) x
        where case when jsonb_typeof(x) = 'number' and x::text ~ '^[0-9]{1,6}$' then (x::text)::numeric > 100000 else true end) then
        return jsonb_build_object('ok',false,'code','invalid','motivo','Pesos inválidos.'); end if;
    end if;
    if v_key in ('nome','descricao_vitoria','descricao_operacional') and jsonb_typeof(v_value) = 'string' then
      p_alteracoes := jsonb_set(p_alteracoes, array[v_key], to_jsonb(btrim(v_value #>> '{}', E' \t\r\n')));
    end if;
  end loop;
  if (p_alteracoes ? 'nome' and (length(p_alteracoes->>'nome') not between 1 and 255 or p_alteracoes->>'nome' ~ '[[:cntrl:]]'))
    or length(p_alteracoes->>'descricao_vitoria') > 500 or length(p_alteracoes->>'descricao_operacional') > 1000
    or length(p_alteracoes->>'emoji') > 16
    or (p_alteracoes ? 'canal_uso' and p_alteracoes->>'canal_uso' not in ('presencial','delivery','ambos'))
    or (p_alteracoes ? 'expira_em_dias' and (p_alteracoes->>'expira_em_dias')::integer not between 1 and 90) then
    return jsonb_build_object('ok',false,'code','invalid','motivo','Texto ou configuração inválidos.'); end if;
  for v_key in select unnest(array['descricao_vitoria','descricao_operacional']) loop
    if p_alteracoes->>v_key = '' then p_alteracoes := jsonb_set(p_alteracoes, array[v_key], 'null'::jsonb); end if;
    if translate(p_alteracoes->>v_key, E'\t\n\r', '') ~ '[[:cntrl:]]' then
      return jsonb_build_object('ok',false,'code','invalid','motivo','Descrição contém caracteres inválidos.'); end if;
  end loop;
  -- Configuration before prize lock; same direction as the giro configuration locks.
  select v2_modo_teste into v_teste from public.roleta_configuracoes where id = 1 for share;
  select * into v_antes from public.premios_roleta where id = p_premio_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found','motivo','Prêmio não encontrado.'); end if;
  if v_antes.versao = 2 and v_antes.codigo is distinct from 'piloto_interno_sem_valor_v2'
    and p_alteracoes->>'ativo' = 'true' and coalesce(v_teste, true) then
    return jsonb_build_object('ok',false,'code','pilot','motivo','Prêmios comerciais devem permanecer em rascunho durante o piloto.'); end if;
  -- Preserve the previous special-prize protection even when it is renamed.
  if v_antes.nome ~* 'playstation' or p_alteracoes->>'nome' ~* 'playstation' then
    p_alteracoes := jsonb_set(p_alteracoes, '{participa_roleta}', 'false'::jsonb);
  end if;
  select * into v_depois from jsonb_populate_record(v_antes, p_alteracoes);
  if to_jsonb(v_antes) = to_jsonb(v_depois) then return jsonb_build_object('ok',true,'premio',to_jsonb(v_antes)); end if;
  select jsonb_agg(key order by key) into v_campos from jsonb_each(p_alteracoes)
    where to_jsonb(v_antes)->key is distinct from to_jsonb(v_depois)->key;
  update public.premios_roleta set nome = v_depois.nome, descricao_vitoria = v_depois.descricao_vitoria,
    emoji = v_depois.emoji, probabilidade = v_depois.probabilidade, ativo = v_depois.ativo, valor = v_depois.valor,
    participa_roleta = v_depois.participa_roleta, canal_uso = v_depois.canal_uso, custo_estimado = v_depois.custo_estimado,
    expira_em_dias = v_depois.expira_em_dias, pesos_nivel = v_depois.pesos_nivel,
    descricao_operacional = v_depois.descricao_operacional, atualizado_em = now()
    where id = p_premio_id returning * into v_depois;
  insert into public.administracao_eventos(entidade, entidade_id, acao, actor_user_id, actor_email, detalhes)
    values ('configuracao','premio:' || p_premio_id::text,'premio_roleta_atualizado',v_actor.user_id,v_actor.email,
      jsonb_build_object('premio_id',p_premio_id,'nome',v_depois.nome,'campos_alterados',v_campos,
        'antes',to_jsonb(v_antes),'depois',to_jsonb(v_depois)));
  return jsonb_build_object('ok',true,'premio',to_jsonb(v_depois));
end $$;
revoke all on function public.atualizar_premio_roleta(bigint,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.atualizar_premio_roleta(bigint,uuid,jsonb) to service_role;
commit;
