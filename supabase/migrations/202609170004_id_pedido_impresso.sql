begin;

-- A prova de conceito confirmou que o ID impresso no fechamento da mesa bate
-- com id_sale na Saipos; ele vira a chave principal de reconciliação do piloto.
alter table public.comandas_roleta
  add column if not exists id_pedido_impresso text;
create unique index if not exists comandas_roleta_pedido_impresso_unico_idx
  on public.comandas_roleta(id_pedido_impresso)
  where id_pedido_impresso is not null;

drop function if exists public.liberar_roleta_por_comanda(uuid, uuid, text, text, date, time, numeric, smallint, text, timestamptz);

create or replace function public.liberar_roleta_por_comanda(
  p_comanda_id uuid,
  p_actor_user_id uuid,
  p_actor_nome text,
  p_actor_email text,
  p_data_operacional date,
  p_horario_abertura time,
  p_id_pedido_impresso text,
  p_valor_confirmado numeric,
  p_nivel_roleta smallint,
  p_token_hash text,
  p_expira_em timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda public.comandas_roleta%rowtype;
  v_config public.roleta_configuracoes%rowtype;
  v_sessao_id uuid;
begin
  if p_valor_confirmado < 0 or p_valor_confirmado > 100000 or p_nivel_roleta not between 1 and 5 then return jsonb_build_object('ok', false, 'motivo', 'Valor ou faixa inválidos.'); end if;
  if p_id_pedido_impresso !~ '^[0-9]{4,30}$' then return jsonb_build_object('ok', false, 'motivo', 'ID do pedido impresso inválido.'); end if;
  select * into v_config from public.roleta_configuracoes where id = 1;
  if not found or not v_config.v2_publicada then return jsonb_build_object('ok', false, 'motivo', 'A Roleta V2 de teste ainda não foi liberada pela administração.'); end if;
  select * into v_comanda from public.comandas_roleta where id = p_comanda_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Comanda não encontrada.'); end if;
  if v_comanda.criado_por is distinct from p_actor_user_id then return jsonb_build_object('ok', false, 'motivo', 'Somente quem enviou a comanda pode confirmar seus dados.'); end if;
  if v_comanda.status <> 'aguardando_confirmacao' then return jsonb_build_object('ok', false, 'motivo', 'Esta comanda já foi confirmada, analisada ou encerrada.'); end if;
  if exists (select 1 from public.comandas_roleta where id_pedido_impresso = p_id_pedido_impresso and id <> p_comanda_id) then return jsonb_build_object('ok', false, 'motivo', 'Este ID do pedido já foi usado em outra comanda.'); end if;

  insert into public.roleta_sessoes(token_hash, nivel, valor_comanda, mesa_referencia, criado_por, criado_por_nome, expira_em, detalhes)
  values (p_token_hash, p_nivel_roleta, p_valor_confirmado, v_comanda.mesa_referencia, p_actor_user_id, p_actor_nome, p_expira_em, jsonb_build_object('origem', 'piloto_comanda', 'comanda_id', p_comanda_id, 'id_pedido_impresso', p_id_pedido_impresso)) returning id into v_sessao_id;
  update public.comandas_roleta set status = 'qr_emitido', data_operacional = p_data_operacional, horario_abertura = p_horario_abertura, id_pedido_impresso = p_id_pedido_impresso, valor_confirmado = p_valor_confirmado, nivel_roleta = p_nivel_roleta, confirmada_por = p_actor_user_id, confirmada_por_nome = p_actor_nome, confirmada_em = now(), sessao_id = v_sessao_id where id = p_comanda_id;
  insert into public.administracao_eventos(entidade, entidade_id, acao, actor_user_id, actor_email, detalhes)
  values ('comanda', p_comanda_id::text, 'qr_teste_emitido', p_actor_user_id, p_actor_email, jsonb_build_object('sessao_id', v_sessao_id, 'mesa_referencia', v_comanda.mesa_referencia, 'data_operacional', p_data_operacional, 'horario_abertura', p_horario_abertura, 'id_pedido_impresso', p_id_pedido_impresso, 'valor_confirmado', p_valor_confirmado, 'nivel_roleta', p_nivel_roleta, 'reconciliacao_status', 'pendente'));
  return jsonb_build_object('ok', true, 'sessao_id', v_sessao_id);
exception when unique_violation then return jsonb_build_object('ok', false, 'motivo', 'Este ID do pedido ou mesa/horário já está em uso.');
end;
$$;

revoke all on function public.liberar_roleta_por_comanda(uuid, uuid, text, text, date, time, text, numeric, smallint, text, timestamptz) from public, anon, authenticated;

commit;
