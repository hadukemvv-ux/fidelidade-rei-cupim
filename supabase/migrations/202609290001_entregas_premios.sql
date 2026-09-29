begin;

-- PROPOSTA NÃO APLICADA. Sem catálogo, seed comercial, backfill ou auto-delete.
-- Dois gates: env no servidor e configuração no banco. Ambos começam desligados.
-- Foto aprovada do prêmio: somente caminho local servido pelo próprio site.
alter table public.premios_roleta add column if not exists imagem_url text;
alter table public.premios_roleta add constraint premios_roleta_imagem_url_segura
  check (imagem_url is null or (length(imagem_url) <= 1024
    and imagem_url ~ '^/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.(png|webp|jpg|jpeg)$'));

create table public.entregas_configuracao (
  id smallint primary key check (id = 1),
  habilitado boolean not null default false,
  permitir_comercial boolean not null default false
);
insert into public.entregas_configuracao(id) values (1);

create table public.entregas_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 1 and 120),
  unidade text not null check (length(unidade) between 1 and 60),
  categoria text not null check (categoria in ('cerveja', 'sobremesa')),
  ativo boolean not null default false,
  saipos_produto_id text unique
);

create table public.entregas_premios (
  id uuid primary key default gen_random_uuid(),
  giro_id uuid not null unique references public.roleta_giros(id) on delete restrict,
  sessao_id uuid not null unique references public.roleta_sessoes(id) on delete restrict,
  cupom_id uuid not null unique references public.cupons_promocionais(id) on delete restrict,
  operador_id uuid references auth.users(id) on delete set null,
  tipo_premio text not null check (tipo_premio in ('saideira', 'expulsadeira', 'sobremesa')),
  quantidade smallint not null check (quantidade in (1, 2)),
  modo_teste boolean not null,
  status text not null default 'pendente' check (status in ('pendente', 'selecionada', 'entregue', 'bloqueada')),
  versao integer not null default 0 check (versao >= 0),
  produto_id uuid references public.entregas_produtos(id) on delete restrict,
  produto_nome text,
  unidade text,
  criado_em timestamptz not null default now(),
  entregue_em timestamptz,
  entregue_por uuid references auth.users(id) on delete set null,
  lancado_em timestamptz,
  lancado_por uuid references auth.users(id) on delete set null,
  check (quantidade = case when tipo_premio = 'expulsadeira' then 2 else 1 end),
  check ((status in ('pendente', 'bloqueada') and produto_id is null) or (status in ('selecionada', 'entregue') and produto_id is not null and produto_nome is not null and unidade is not null)),
  check ((status = 'entregue') = (entregue_em is not null)),
  check (lancado_em is null or (entregue_em is not null and lancado_em >= entregue_em))
);

-- Opções aprovadas pelo servidor, nunca pelo cliente/OCR. Cervejas dependem
-- de mapeamento validado da composição da conta; vazio significa BLOQUEADO.
create table public.entregas_opcoes (
  entrega_id uuid not null references public.entregas_premios(id) on delete restrict,
  produto_id uuid not null references public.entregas_produtos(id) on delete restrict,
  primary key (entrega_id, produto_id)
);

create table public.entregas_eventos (
  id bigint generated always as identity primary key,
  entrega_id uuid not null references public.entregas_premios(id) on delete restrict,
  versao integer not null,
  acao text not null check (acao in ('criada', 'bloqueada', 'selecionar', 'entregar', 'lancar')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_nome text,
  actor_papel text,
  produto_id uuid references public.entregas_produtos(id) on delete restrict,
  criado_em timestamptz not null default now(),
  unique (entrega_id, versao)
);
create index entregas_premios_pendencias_idx on public.entregas_premios(operador_id, criado_em desc) where lancado_em is null;
create index entregas_premios_dia_idx on public.entregas_premios(entregue_em) where status = 'entregue';

alter table public.entregas_configuracao enable row level security;
alter table public.entregas_produtos enable row level security;
alter table public.entregas_premios enable row level security;
alter table public.entregas_opcoes enable row level security;
alter table public.entregas_eventos enable row level security;
revoke all on public.entregas_configuracao, public.entregas_produtos, public.entregas_premios, public.entregas_opcoes, public.entregas_eventos from public, anon, authenticated;
revoke all on public.entregas_configuracao, public.entregas_produtos, public.entregas_premios, public.entregas_opcoes, public.entregas_eventos from service_role;
grant select, insert, update on public.entregas_configuracao, public.entregas_produtos, public.entregas_premios, public.entregas_opcoes to service_role;
grant select, insert on public.entregas_eventos to service_role;
grant usage, select on sequence public.entregas_eventos_id_seq to service_role;

-- Bloqueia a ativação enquanto houver cupons físicos abertos sem ledger.
-- Evita que um cupom antigo seja consumido fora do registro de entregas.
create function public.verificar_ativacao_entregas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.habilitado and not old.habilitado and exists (
    select 1 from public.cupons_promocionais c
    where c.tipo_premio in ('saideira', 'expulsadeira', 'sobremesa')
      and c.status in ('teste', 'emitido', 'validado') and c.expira_em > now()
      and not exists (select 1 from public.entregas_premios e where e.cupom_id = c.id)
  ) then raise exception 'Cupons físicos abertos sem registro de entrega; revisar antes de ativar'; end if;
  return new;
end; $$;
revoke all on function public.verificar_ativacao_entregas() from public, anon, authenticated;
create trigger verificar_ativacao_entregas before update of habilitado on public.entregas_configuracao
  for each row execute function public.verificar_ativacao_entregas();

-- A roda pública deve exibir o mesmo conjunto que o sorteio usa. O giro
-- continua autoridade final sob lock caso o estado mude após a consulta.
create function public.listar_premios_elegiveis_v2(p_sessao_id uuid)
returns table(nome text, emoji text, imagem_url text)
language sql security definer set search_path = '' as $$
  select p.nome, p.emoji, p.imagem_url from public.premios_roleta p
  join public.roleta_sessoes s on s.id = p_sessao_id
  join public.roleta_configuracoes r on r.id = 1
  join public.entregas_configuracao e on e.id = 1
  where r.v2_publicada and s.status in ('criada', 'aberta') and s.expira_em > now()
    and p.versao = 2 and p.ativo and coalesce(p.participa_roleta, true)
    and greatest(0, coalesce(p.pesos_nivel[s.nivel], 0)) > 0
    and (p.tipo not in ('saideira', 'expulsadeira', 'sobremesa') or (
      e.habilitado and (r.v2_modo_teste or e.permitir_comercial)
      and s.criado_por is not null
      and exists (
        select 1 from public.comandas_roleta c
        join public.perfis_operacionais o on o.user_id = c.criado_por and o.ativo
        where c.sessao_id = s.id and c.criado_por = s.criado_por
      )
    ))
  order by p.id;
$$;
revoke all on function public.listar_premios_elegiveis_v2(uuid) from public, anon, authenticated;
grant execute on function public.listar_premios_elegiveis_v2(uuid) to service_role;

-- Filtrar prêmios físicos ANTES de usar p_aleatorio. Sessão manual, operador
-- ausente, comanda ausente e gate comercial desligado não entram no sorteio.
-- O lock SHARE estabiliza os gates enquanto o giro/pendência é confirmado.
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
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_config public.roleta_configuracoes%rowtype;
  v_entregas public.entregas_configuracao%rowtype;
  v_sessao public.roleta_sessoes%rowtype;
  v_premio public.premios_roleta%rowtype;
  v_pode_fisico boolean := false;
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

  select * into v_config from public.roleta_configuracoes where id = 1 for share;
  if not found or not v_config.v2_publicada then
    return jsonb_build_object('ok', false, 'motivo', 'A Roleta V2 ainda não está disponível.');
  end if;
  select * into v_sessao from public.roleta_sessoes where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'QR inválido.'); end if;
  if v_sessao.expira_em <= now() then
    update public.roleta_sessoes set status = 'expirada'
      where id = v_sessao.id and status in ('criada', 'aberta');
    return jsonb_build_object('ok', false, 'motivo', 'Este QR expirou. Peça um novo à equipe.');
  end if;
  if v_sessao.status not in ('criada', 'aberta') then
    return jsonb_build_object('ok', false, 'motivo', 'Este QR já foi utilizado ou não está disponível.');
  end if;

  select * into v_entregas from public.entregas_configuracao where id = 1 for share;
  if found and v_entregas.habilitado and (v_config.v2_modo_teste or v_entregas.permitir_comercial)
    and v_sessao.criado_por is not null then
    select exists (
      select 1 from public.comandas_roleta c
      join public.perfis_operacionais p on p.user_id = c.criado_por and p.ativo
      where c.sessao_id = v_sessao.id and c.criado_por = v_sessao.criado_por
    ) into v_pode_fisico;
  end if;

  select coalesce(sum(greatest(0, coalesce(p.pesos_nivel[v_sessao.nivel], 0))), 0)
    into v_total from public.premios_roleta p
    where p.versao = 2 and p.ativo and coalesce(p.participa_roleta, true)
      and (v_pode_fisico or p.tipo not in ('saideira', 'expulsadeira', 'sobremesa'));
  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'A roleta ainda não possui prêmios ativos.');
  end if;

  v_alvo := p_aleatorio * v_total;
  for v_premio in
    select * from public.premios_roleta p
    where p.versao = 2 and p.ativo and coalesce(p.participa_roleta, true)
      and (v_pode_fisico or p.tipo not in ('saideira', 'expulsadeira', 'sobremesa'))
    order by p.id
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
  update public.roleta_sessoes set status = 'girada', girada_em = now() where id = v_sessao.id;
  return jsonb_build_object(
    'ok', true,
    'premio', jsonb_build_object('nome', v_premio.nome, 'descricao_vitoria', v_premio.descricao_vitoria,
      'emoji', v_premio.emoji, 'imagem_url', v_premio.imagem_url, 'canal_uso', v_premio.canal_uso),
    'cupom_id', v_cupom_id, 'expira_em', v_expira_em, 'modo_teste', v_config.v2_modo_teste
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Este QR já foi utilizado.');
end; $$;
revoke all on function public.girar_roleta_v2(text, text, bigint, boolean, text, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.girar_roleta_v2(text, text, bigint, boolean, text, text, text, numeric, text, text) to service_role;

-- Pendência e giro na mesma transação. Caso raro de pré-condição alterada:
-- registra bloqueada para revisão, SEM lançar exceção depois do sorteio.
create function public.abrir_entrega_premio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cupom public.cupons_promocionais%rowtype;
  v_sessao public.roleta_sessoes%rowtype;
  v_id uuid;
  v_bloqueada boolean := false;
begin
  if not exists (select 1 from public.entregas_configuracao where id = 1 and habilitado) then return new; end if;
  select * into v_cupom from public.cupons_promocionais where id = new.cupom_id;
  if not found or v_cupom.tipo_premio not in ('saideira', 'expulsadeira', 'sobremesa') then return new; end if;
  if not v_cupom.modo_teste and not exists (select 1 from public.entregas_configuracao where id = 1 and permitir_comercial) then
    v_bloqueada := true;
  end if;
  select * into v_sessao from public.roleta_sessoes where id = new.sessao_id;
  if v_sessao.criado_por is null or not exists (
    select 1 from public.comandas_roleta where sessao_id = new.sessao_id and criado_por = v_sessao.criado_por
  ) then v_bloqueada := true; end if;
  insert into public.entregas_premios(giro_id, sessao_id, cupom_id, operador_id, tipo_premio, quantidade, modo_teste, status)
  values (new.id, new.sessao_id, new.cupom_id, v_sessao.criado_por, v_cupom.tipo_premio,
    case when v_cupom.tipo_premio = 'expulsadeira' then 2 else 1 end, v_cupom.modo_teste,
    case when v_bloqueada then 'bloqueada' else 'pendente' end) returning id into v_id;
  insert into public.entregas_eventos(entrega_id, versao, acao, actor_id)
    values (v_id, 0, case when v_bloqueada then 'bloqueada' else 'criada' end, v_sessao.criado_por);
  return new;
end; $$;
revoke all on function public.abrir_entrega_premio() from public, anon, authenticated;
create trigger abrir_entrega_apos_giro after insert on public.roleta_giros for each row execute function public.abrir_entrega_premio();

create function public.registrar_entrega_premio(p_entrega_id uuid, p_actor_id uuid, p_acao text, p_versao integer, p_produto_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.perfis_operacionais%rowtype;
  v_entrega public.entregas_premios%rowtype;
  v_cupom public.cupons_promocionais%rowtype;
  v_produto public.entregas_produtos%rowtype;
begin
  if p_acao is null or p_acao not in ('selecionar', 'entregar', 'lancar') or p_versao is null then
    return jsonb_build_object('ok', false, 'motivo', 'Ação inválida.'); end if;
  if not exists (select 1 from public.entregas_configuracao where id = 1 and habilitado) or not exists (
    select 1 from public.seguranca_configuracoes where id = 1 and modo_contencao = false
  ) then return jsonb_build_object('ok', false, 'motivo', 'Operação pausada.'); end if;
  -- Perfil do banco é autoridade; nome/papel não vêm do corpo do navegador.
  select * into v_actor from public.perfis_operacionais where user_id = p_actor_id and ativo for share;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Operador indisponível.'); end if;
  select * into v_entrega from public.entregas_premios where id = p_entrega_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Entrega indisponível.'); end if;
  if (p_acao = 'lancar' and v_actor.papel not in ('caixa', 'superadmin')) or
    (p_acao <> 'lancar' and not (v_actor.papel = 'superadmin' or (v_actor.papel = 'garcom' and v_entrega.operador_id = p_actor_id))) then
    return jsonb_build_object('ok', false, 'motivo', 'Sem permissão.'); end if;
  if v_entrega.versao <> p_versao then return jsonb_build_object('ok', false, 'motivo', 'Registro alterado. Atualize a lista.'); end if;
  if not v_entrega.modo_teste and not exists (select 1 from public.entregas_configuracao where id = 1 and permitir_comercial) then
    return jsonb_build_object('ok', false, 'motivo', 'Operação comercial não habilitada.'); end if;

  if p_acao = 'lancar' then
    if p_produto_id is not null or v_entrega.status <> 'entregue' or v_entrega.lancado_em is not null then
      return jsonb_build_object('ok', false, 'motivo', 'Entrega não lançável ou já lançada.'); end if;
    update public.entregas_premios set lancado_em = now(), lancado_por = p_actor_id, versao = versao + 1 where id = p_entrega_id;
  else
    -- Compartilha o lock do validador legado: um cupom não pode ser usado duas vezes.
    select * into v_cupom from public.cupons_promocionais where id = v_entrega.cupom_id for update;
    if not found or v_cupom.expira_em <= now() or v_cupom.modo_teste <> v_entrega.modo_teste
      or v_cupom.tipo_premio <> v_entrega.tipo_premio
      or (v_entrega.modo_teste and v_cupom.status <> 'teste')
      or (not v_entrega.modo_teste and v_cupom.status not in ('emitido', 'validado')) then
      return jsonb_build_object('ok', false, 'motivo', 'Cupom indisponível.'); end if;
    if not v_entrega.modo_teste and (
      not (extract(isodow from (now() at time zone 'America/Fortaleza'))::smallint = any(v_cupom.dias_semana_validos))
      or (v_cupom.nao_valido_feriado and exists (select 1 from public.feriados_operacionais where data = (now() at time zone 'America/Fortaleza')::date and ativo))
    ) then return jsonb_build_object('ok', false, 'motivo', 'Cupom não válido nesta data.'); end if;
    if v_entrega.status not in ('pendente', 'selecionada') then return jsonb_build_object('ok', false, 'motivo', 'Entrega já confirmada.'); end if;
    if p_acao = 'entregar' and (p_produto_id is not null or v_entrega.status <> 'selecionada') then
      return jsonb_build_object('ok', false, 'motivo', 'Selecione o item antes de entregar.'); end if;
    select p.* into v_produto from public.entregas_produtos p join public.entregas_opcoes o on o.produto_id = p.id
      where o.entrega_id = p_entrega_id and p.id = case when p_acao = 'selecionar' then p_produto_id else v_entrega.produto_id end
        and p.ativo and p.categoria = case when v_entrega.tipo_premio = 'sobremesa' then 'sobremesa' else 'cerveja' end for share of p, o;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'Opção não aprovada para esta conta.'); end if;
    if p_acao = 'selecionar' then
      update public.entregas_premios set produto_id = v_produto.id, produto_nome = v_produto.nome, unidade = v_produto.unidade,
        status = 'selecionada', versao = versao + 1 where id = p_entrega_id;
    else
      update public.entregas_premios set produto_nome = v_produto.nome, unidade = v_produto.unidade,
        status = 'entregue', entregue_em = now(), entregue_por = p_actor_id, versao = versao + 1 where id = p_entrega_id;
      if not v_entrega.modo_teste then
        update public.cupons_promocionais set status = 'usado', usado_em = now(), usado_por = p_actor_id where id = v_cupom.id;
        insert into public.cupom_eventos(cupom_id, acao, actor_user_id, actor_nome, actor_email, actor_papel, origem)
          values (v_cupom.id, 'usado', p_actor_id, v_actor.nome, v_actor.email, v_actor.papel, 'entrega_fisica');
      end if;
    end if;
  end if;
  insert into public.entregas_eventos(entrega_id, versao, acao, actor_id, actor_nome, actor_papel, produto_id)
    select id, versao, p_acao, p_actor_id, v_actor.nome, v_actor.papel, produto_id from public.entregas_premios where id = p_entrega_id;
  return jsonb_build_object('ok', true, 'entrega_id', p_entrega_id, 'versao', p_versao + 1);
end; $$;
revoke all on function public.registrar_entrega_premio(uuid, uuid, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.registrar_entrega_premio(uuid, uuid, text, integer, uuid) to service_role;

-- O validador antigo não pode consumir prêmio físico sem registrar o item.
-- A entrega atualiza o ledger ANTES do cupom, sob os mesmos locks/transação.
create function public.proteger_consumo_premio_fisico() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'usado' and old.status <> 'usado'
    and new.tipo_premio in ('saideira', 'expulsadeira', 'sobremesa')
    and exists (select 1 from public.entregas_configuracao where id = 1 and habilitado)
    and not exists (select 1 from public.entregas_premios where cupom_id = new.id and status = 'entregue')
  then raise exception 'Prêmio físico exige registro de item e entrega'; end if;
  return new;
end; $$;
revoke all on function public.proteger_consumo_premio_fisico() from public, anon, authenticated;
create trigger proteger_consumo_premio_fisico before update of status on public.cupons_promocionais
  for each row execute function public.proteger_consumo_premio_fisico();

commit;
