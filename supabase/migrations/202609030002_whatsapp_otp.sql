begin;

alter table if exists public.base_clientes_saipos
  add column if not exists telefone_verificado_em timestamptz;

create table if not exists public.otp_verificacoes (
  id uuid primary key default gen_random_uuid(),
  telefone_hash text not null,
  ip_hash text not null,
  proposito text not null check (proposito in ('cadastro', 'redefinir_pin')),
  status text not null default 'reservado'
    check (status in ('reservado', 'enviado', 'verificado', 'consumido', 'falhou')),
  provedor_sid text,
  tentativas integer not null default 0 check (tentativas >= 0),
  grant_hash text unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '10 minutes'),
  verificado_em timestamptz,
  consumido_em timestamptz
);

create index if not exists otp_verificacoes_telefone_data_idx
  on public.otp_verificacoes(telefone_hash, criado_em desc);
create index if not exists otp_verificacoes_ip_data_idx
  on public.otp_verificacoes(ip_hash, criado_em desc);
create index if not exists otp_verificacoes_status_data_idx
  on public.otp_verificacoes(status, criado_em desc);

alter table public.otp_verificacoes enable row level security;
revoke all on public.otp_verificacoes from public, anon, authenticated;

create or replace function public.reservar_envio_otp(
  p_telefone_hash text,
  p_ip_hash text,
  p_proposito text,
  p_max_telefone_hora integer default 3,
  p_max_ip_hora integer default 10,
  p_max_global_dia integer default 30,
  p_intervalo_segundos integer default 60
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ultimo timestamptz;
  v_contagem integer;
  v_retry integer;
begin
  if p_proposito not in ('cadastro', 'redefinir_pin') then
    raise exception 'Propósito de OTP inválido';
  end if;

  -- Serializa as reservas para impedir que chamadas paralelas ultrapassem os tetos.
  perform pg_advisory_xact_lock(hashtextextended('fidelidade_otp_limites', 0));

  select max(criado_em) into v_ultimo
  from public.otp_verificacoes
  where telefone_hash = p_telefone_hash
    and status <> 'falhou';

  if v_ultimo is not null and v_ultimo > now() - make_interval(secs => p_intervalo_segundos) then
    v_retry := greatest(1, ceil(extract(epoch from (v_ultimo + make_interval(secs => p_intervalo_segundos) - now())))::integer);
    return jsonb_build_object('autorizado', false, 'motivo', 'intervalo', 'tentar_em_segundos', v_retry);
  end if;

  select count(*) into v_contagem from public.otp_verificacoes
  where telefone_hash = p_telefone_hash
    and criado_em >= now() - interval '1 hour'
    and status <> 'falhou';
  if v_contagem >= p_max_telefone_hora then
    return jsonb_build_object('autorizado', false, 'motivo', 'telefone_hora', 'tentar_em_segundos', 3600);
  end if;

  select count(*) into v_contagem from public.otp_verificacoes
  where ip_hash = p_ip_hash
    and criado_em >= now() - interval '1 hour'
    and status <> 'falhou';
  if v_contagem >= p_max_ip_hora then
    return jsonb_build_object('autorizado', false, 'motivo', 'ip_hora', 'tentar_em_segundos', 3600);
  end if;

  select count(*) into v_contagem from public.otp_verificacoes
  where criado_em >= date_trunc('day', now())
    and status <> 'falhou';
  if v_contagem >= p_max_global_dia then
    return jsonb_build_object('autorizado', false, 'motivo', 'global_dia', 'tentar_em_segundos', 86400);
  end if;

  insert into public.otp_verificacoes(telefone_hash, ip_hash, proposito)
  values (p_telefone_hash, p_ip_hash, p_proposito)
  returning id into v_id;

  return jsonb_build_object('autorizado', true, 'solicitacao_id', v_id);
end;
$$;

create or replace function public.registrar_tentativa_otp(
  p_solicitacao_id uuid,
  p_telefone_hash text,
  p_proposito text,
  p_max_tentativas integer default 5
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.otp_verificacoes
  set tentativas = tentativas + 1
  where id = p_solicitacao_id
    and telefone_hash = p_telefone_hash
    and proposito = p_proposito
    and status = 'enviado'
    and expira_em > now()
    and tentativas < p_max_tentativas
  returning id into v_id;
  return v_id is not null;
end;
$$;

create or replace function public.consumir_grant_otp(
  p_grant_hash text,
  p_telefone_hash text,
  p_proposito text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.otp_verificacoes
  set status = 'consumido', consumido_em = now(), grant_hash = null
  where grant_hash = p_grant_hash
    and telefone_hash = p_telefone_hash
    and proposito = p_proposito
    and status = 'verificado'
    and expira_em > now()
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.reservar_envio_otp(text,text,text,integer,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.registrar_tentativa_otp(uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.consumir_grant_otp(text,text,text) from public, anon, authenticated;
grant execute on function public.reservar_envio_otp(text,text,text,integer,integer,integer,integer) to service_role;
grant execute on function public.registrar_tentativa_otp(uuid,text,text,integer) to service_role;
grant execute on function public.consumir_grant_otp(text,text,text) to service_role;

comment on table public.otp_verificacoes is
  'Auditoria e controle de custo de OTP. Telefones e IPs são armazenados somente como HMAC.';

commit;
