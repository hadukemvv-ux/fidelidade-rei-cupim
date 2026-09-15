begin;

-- Uma única configuração central, privada e consultada pelo servidor antes
-- de executar operações públicas ou automações sensíveis.
create table if not exists public.seguranca_configuracoes (
  id smallint primary key default 1 check (id = 1),
  modo_contencao boolean not null default false,
  incidente_atual_id uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.incidentes_seguranca (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('contido', 'em_investigacao', 'comunicado', 'encerrado')),
  severidade text not null check (severidade in ('suspeita', 'baixo', 'moderado', 'alto', 'critico')),
  descricao text not null check (char_length(descricao) between 10 and 2000),
  escopo text check (escopo is null or char_length(escopo) <= 2000),
  iniciado_por uuid references auth.users(id) on delete set null,
  iniciado_por_email text,
  iniciado_em timestamptz not null default now(),
  contencao_desativada_em timestamptz,
  contencao_desativada_por uuid references auth.users(id) on delete set null,
  encerrado_em timestamptz,
  encerrado_por uuid references auth.users(id) on delete set null
);

alter table public.seguranca_configuracoes
  add constraint seguranca_configuracoes_incidente_atual_fkey
  foreign key (incidente_atual_id) references public.incidentes_seguranca(id) on delete set null;

create table if not exists public.incidente_eventos (
  id bigint generated always as identity primary key,
  incidente_id uuid not null references public.incidentes_seguranca(id) on delete cascade,
  acao text not null check (acao in ('contencao_ativada', 'contencao_ja_ativa', 'contencao_desativada', 'status_atualizado', 'nota_adicionada')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  motivo text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists incidentes_seguranca_status_idx on public.incidentes_seguranca(status, iniciado_em desc);
create index if not exists incidente_eventos_incidente_idx on public.incidente_eventos(incidente_id, criado_em desc);

insert into public.seguranca_configuracoes(id)
values (1)
on conflict (id) do nothing;

alter table public.seguranca_configuracoes enable row level security;
alter table public.incidentes_seguranca enable row level security;
alter table public.incidente_eventos enable row level security;
revoke all on public.seguranca_configuracoes, public.incidentes_seguranca, public.incidente_eventos from public, anon, authenticated;

create or replace function public.iniciar_contencao_incidente(
  p_actor_user_id uuid,
  p_actor_email text,
  p_severidade text,
  p_descricao text,
  p_escopo text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.seguranca_configuracoes%rowtype;
  v_incidente public.incidentes_seguranca%rowtype;
begin
  if p_severidade not in ('suspeita', 'baixo', 'moderado', 'alto', 'critico') then
    raise exception 'Severidade inválida';
  end if;
  if char_length(trim(coalesce(p_descricao, ''))) < 10 then
    raise exception 'Descreva o motivo da contenção';
  end if;

  select * into v_config from public.seguranca_configuracoes where id = 1 for update;
  if v_config.modo_contencao and v_config.incidente_atual_id is not null then
    select * into v_incidente from public.incidentes_seguranca where id = v_config.incidente_atual_id;
    insert into public.incidente_eventos(incidente_id, acao, actor_user_id, actor_email, motivo)
    values (v_incidente.id, 'contencao_ja_ativa', p_actor_user_id, p_actor_email, left(trim(p_descricao), 2000));
    return jsonb_build_object('incidente_id', v_incidente.id, 'ja_ativo', true, 'status', v_incidente.status);
  end if;

  insert into public.incidentes_seguranca(status, severidade, descricao, escopo, iniciado_por, iniciado_por_email)
  values ('contido', p_severidade, trim(p_descricao), nullif(trim(coalesce(p_escopo, '')), ''), p_actor_user_id, p_actor_email)
  returning * into v_incidente;

  update public.seguranca_configuracoes
  set modo_contencao = true, incidente_atual_id = v_incidente.id, atualizado_em = now(), atualizado_por = p_actor_user_id
  where id = 1;

  insert into public.incidente_eventos(incidente_id, acao, actor_user_id, actor_email, motivo, detalhes)
  values (v_incidente.id, 'contencao_ativada', p_actor_user_id, p_actor_email, left(trim(p_descricao), 2000), '{"bloqueios":"cadastro, OTP, resgate, roleta, cupons, Saipos"}'::jsonb);

  return jsonb_build_object('incidente_id', v_incidente.id, 'ja_ativo', false, 'status', v_incidente.status);
end;
$$;

create or replace function public.desativar_contencao_incidente(
  p_incidente_id uuid,
  p_actor_user_id uuid,
  p_actor_email text,
  p_motivo text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.seguranca_configuracoes%rowtype;
  v_incidente public.incidentes_seguranca%rowtype;
begin
  if char_length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Registre o motivo da reabertura';
  end if;

  select * into v_config from public.seguranca_configuracoes where id = 1 for update;
  if not v_config.modo_contencao or v_config.incidente_atual_id is distinct from p_incidente_id then
    raise exception 'Este não é o incidente atualmente em contenção';
  end if;

  update public.incidentes_seguranca
  set status = 'em_investigacao', contencao_desativada_em = now(), contencao_desativada_por = p_actor_user_id
  where id = p_incidente_id
  returning * into v_incidente;

  update public.seguranca_configuracoes
  set modo_contencao = false, incidente_atual_id = null, atualizado_em = now(), atualizado_por = p_actor_user_id
  where id = 1;

  insert into public.incidente_eventos(incidente_id, acao, actor_user_id, actor_email, motivo)
  values (p_incidente_id, 'contencao_desativada', p_actor_user_id, p_actor_email, left(trim(p_motivo), 2000));

  return jsonb_build_object('incidente_id', v_incidente.id, 'status', v_incidente.status);
end;
$$;

revoke all on function public.iniciar_contencao_incidente(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.desativar_contencao_incidente(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.iniciar_contencao_incidente(uuid,text,text,text,text) to service_role;
grant execute on function public.desativar_contencao_incidente(uuid,uuid,text,text) to service_role;

comment on table public.incidentes_seguranca is
  'Registro de incidente sem dados pessoais de clientes. Evidências detalhadas devem ficar em repositório privado com acesso mínimo.';

commit;
