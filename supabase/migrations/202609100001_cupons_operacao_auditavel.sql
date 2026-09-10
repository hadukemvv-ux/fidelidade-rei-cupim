begin;

-- Motor separado dos resgates legados. Cada cupom possui uma vida útil clara,
-- custo estimado e trilha imutável de operações de caixa e gestão.
create table if not exists public.perfis_operacionais (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null check (papel in ('superadmin', 'gestor', 'caixa')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.feriados_operacionais (
  data date primary key,
  descricao text not null,
  abrangencia text not null default 'fortaleza_ce',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.cupons_promocionais (
  id uuid primary key default gen_random_uuid(),
  codigo_hash text not null unique,
  codigo_final text not null,
  cliente_id bigint references public.base_clientes_saipos(id) on delete set null,
  telefone_hash text not null,
  tipo_premio text not null check (tipo_premio in (
    'frete_gratis', 'sobremesa', 'saideira', 'expulsadeira',
    'desconto_presencial_10', 'desconto_delivery_10'
  )),
  canal_uso text not null check (canal_uso in ('presencial', 'delivery', 'ambos')),
  status text not null default 'emitido' check (status in (
    'emitido', 'apresentado', 'validado', 'usado', 'expirado', 'cancelado', 'teste'
  )),
  modo_teste boolean not null default true,
  valor_desconto_percentual numeric(5,2),
  teto_desconto numeric(12,2),
  pedido_minimo numeric(12,2),
  custo_estimado numeric(12,2) not null default 0,
  dias_semana_validos smallint[] not null default array[1,2,3,4,5]::smallint[],
  nao_valido_feriado boolean not null default true,
  origem text not null default 'roleta',
  referencia_origem uuid,
  emitido_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '14 days'),
  apresentado_em timestamptz,
  validado_em timestamptz,
  usado_em timestamptz,
  validado_por uuid references auth.users(id) on delete set null,
  usado_por uuid references auth.users(id) on delete set null,
  detalhes jsonb not null default '{}'::jsonb,
  check (expira_em > emitido_em)
);

create table if not exists public.cupom_eventos (
  id bigint generated always as identity primary key,
  cupom_id uuid not null references public.cupons_promocionais(id) on delete cascade,
  acao text not null check (acao in ('emitido', 'consultado', 'apresentado', 'validado', 'usado', 'expirado', 'cancelado', 'recusado')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_nome text,
  actor_email text,
  actor_papel text,
  origem text not null,
  motivo text,
  request_id uuid,
  ip_hash text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.consentimentos_marketing (
  id bigint generated always as identity primary key,
  cliente_id bigint references public.base_clientes_saipos(id) on delete set null,
  telefone_hash text not null,
  finalidade text not null,
  concedido boolean not null,
  texto_versao text not null,
  canal text not null,
  origem text not null,
  ip_hash text,
  criado_em timestamptz not null default now()
);

create index if not exists cupons_promocionais_status_expira_idx
  on public.cupons_promocionais(status, expira_em);
create index if not exists cupons_promocionais_cliente_idx
  on public.cupons_promocionais(cliente_id, emitido_em desc);
create index if not exists cupom_eventos_cupom_idx
  on public.cupom_eventos(cupom_id, criado_em desc);
create index if not exists consentimentos_marketing_cliente_idx
  on public.consentimentos_marketing(cliente_id, criado_em desc);

alter table public.perfis_operacionais enable row level security;
alter table public.feriados_operacionais enable row level security;
alter table public.cupons_promocionais enable row level security;
alter table public.cupom_eventos enable row level security;
alter table public.consentimentos_marketing enable row level security;
revoke all on public.perfis_operacionais, public.feriados_operacionais,
  public.cupons_promocionais, public.cupom_eventos, public.consentimentos_marketing
  from public, anon, authenticated;

-- Consumo atômico: duas caixas não conseguem confirmar o mesmo cupom.
create or replace function public.usar_cupom_promocional(
  p_codigo_hash text,
  p_actor_user_id uuid,
  p_actor_nome text,
  p_actor_email text,
  p_actor_papel text,
  p_origem text,
  p_request_id uuid default null,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupom public.cupons_promocionais%rowtype;
  v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_dia smallint := extract(isodow from (now() at time zone 'America/Fortaleza'))::smallint;
  v_feriado boolean;
  v_motivo text;
begin
  select * into v_cupom
  from public.cupons_promocionais
  where codigo_hash = p_codigo_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Cupom não encontrado.');
  end if;

  if v_cupom.modo_teste then v_motivo := 'Cupom em modo de teste.';
  elsif v_cupom.status <> 'emitido' and v_cupom.status <> 'validado' then v_motivo := 'Cupom já utilizado, cancelado ou indisponível.';
  elsif v_cupom.expira_em < now() then
    update public.cupons_promocionais set status = 'expirado' where id = v_cupom.id;
    v_motivo := 'Cupom expirado.';
  elsif not (v_dia = any(v_cupom.dias_semana_validos)) then v_motivo := 'Cupom válido somente em dias úteis.';
  elsif v_cupom.nao_valido_feriado and exists (
    select 1 from public.feriados_operacionais where data = v_hoje and ativo
  ) then v_motivo := 'Cupom não é válido em feriado.';
  end if;

  if v_motivo is not null then
    insert into public.cupom_eventos(cupom_id, acao, actor_user_id, actor_nome, actor_email, actor_papel, origem, motivo, request_id, ip_hash)
    values (v_cupom.id, 'recusado', p_actor_user_id, p_actor_nome, p_actor_email, p_actor_papel, p_origem, v_motivo, p_request_id, p_ip_hash);
    return jsonb_build_object('ok', false, 'motivo', v_motivo, 'cupom_id', v_cupom.id);
  end if;

  update public.cupons_promocionais
  set status = 'usado', usado_em = now(), usado_por = p_actor_user_id,
      validado_em = coalesce(validado_em, now()), validado_por = coalesce(validado_por, p_actor_user_id)
  where id = v_cupom.id;

  insert into public.cupom_eventos(cupom_id, acao, actor_user_id, actor_nome, actor_email, actor_papel, origem, request_id, ip_hash)
  values (v_cupom.id, 'usado', p_actor_user_id, p_actor_nome, p_actor_email, p_actor_papel, p_origem, p_request_id, p_ip_hash);

  return jsonb_build_object('ok', true, 'cupom_id', v_cupom.id, 'tipo_premio', v_cupom.tipo_premio, 'canal_uso', v_cupom.canal_uso);
end;
$$;

-- O proprietário indicado pode entrar como superadmin assim que sua conta de Auth existir.
insert into public.perfis_operacionais(user_id, nome, email, papel)
select id, 'hadukem', 'hadukemvv@gmail.com', 'superadmin'
from auth.users where lower(email) = 'hadukemvv@gmail.com'
on conflict (user_id) do update set nome = excluded.nome, email = excluded.email, papel = excluded.papel, ativo = true, atualizado_em = now();

commit;
