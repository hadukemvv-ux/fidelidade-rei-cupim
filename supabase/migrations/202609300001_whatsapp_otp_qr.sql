-- Prepared only: review and explicit approval required before applying.
begin;

alter table public.otp_verificacoes
  add column provedor text not null default 'twilio' check (provedor in ('twilio', 'qr')),
  add column codigo_hash text check (codigo_hash is null or codigo_hash ~ '^[a-f0-9]{64}$');
alter table public.otp_verificacoes drop constraint otp_verificacoes_status_check;
alter table public.otp_verificacoes add constraint otp_verificacoes_status_check
  check (status in ('reservado', 'enviado', 'indeterminado', 'verificado', 'consumido', 'falhou'));

-- Count ALL reservations, including definite failure and transport uncertainty.
-- A failed provider must never release quota for an infinite retry loop.
create or replace function public.reservar_envio_otp(
  p_telefone_hash text, p_ip_hash text, p_proposito text,
  p_max_telefone_hora integer default 3, p_max_ip_hora integer default 10,
  p_max_global_dia integer default 30, p_intervalo_segundos integer default 60
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_ultimo timestamptz; v_contagem integer; v_retry integer;
begin
  if p_telefone_hash is null or p_telefone_hash !~ '^[a-f0-9]{64}$' or
     p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' or
     p_proposito is null or p_proposito not in ('cadastro', 'redefinir_pin') or
     p_max_telefone_hora is null or p_max_telefone_hora not between 1 and 10 or
     p_max_ip_hora is null or p_max_ip_hora not between 1 and 50 or
     p_max_global_dia is null or p_max_global_dia not between 1 and 1000 or
     p_intervalo_segundos is null or p_intervalo_segundos not between 60 and 600 then
    raise exception 'Configuração OTP inválida';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fidelidade_otp_limites', 0));
  select max(criado_em) into v_ultimo from public.otp_verificacoes where telefone_hash = p_telefone_hash;
  if v_ultimo > now() - pg_catalog.make_interval(secs => p_intervalo_segundos) then
    v_retry := greatest(1, ceil(extract(epoch from (v_ultimo + pg_catalog.make_interval(secs => p_intervalo_segundos) - now())))::integer);
    return pg_catalog.jsonb_build_object('autorizado', false, 'motivo', 'intervalo', 'tentar_em_segundos', v_retry);
  end if;
  select count(*) into v_contagem from public.otp_verificacoes
    where telefone_hash = p_telefone_hash and criado_em >= now() - interval '1 hour';
  if v_contagem >= p_max_telefone_hora then
    return pg_catalog.jsonb_build_object('autorizado', false, 'motivo', 'telefone_hora', 'tentar_em_segundos', 3600);
  end if;
  select count(*) into v_contagem from public.otp_verificacoes
    where ip_hash = p_ip_hash and criado_em >= now() - interval '1 hour';
  if v_contagem >= p_max_ip_hora then
    return pg_catalog.jsonb_build_object('autorizado', false, 'motivo', 'ip_hora', 'tentar_em_segundos', 3600);
  end if;
  -- Rolling 24h: stricter than resetting quota at midnight.
  select count(*) into v_contagem from public.otp_verificacoes where criado_em >= now() - interval '24 hours';
  if v_contagem >= p_max_global_dia then
    return pg_catalog.jsonb_build_object('autorizado', false, 'motivo', 'global_dia', 'tentar_em_segundos', 86400);
  end if;
  insert into public.otp_verificacoes(telefone_hash, ip_hash, proposito)
    values (p_telefone_hash, p_ip_hash, p_proposito) returning id into v_id;
  return pg_catalog.jsonb_build_object('autorizado', true, 'solicitacao_id', v_id);
end;
$$;

create function public.preparar_otp_qr(p_id uuid, p_telefone_hash text, p_proposito text, p_codigo_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_expira timestamptz;
begin
  if p_codigo_hash is null or p_codigo_hash !~ '^[a-f0-9]{64}$' then raise exception 'Código OTP inválido'; end if;
  -- Same ordering as reservation; parallel prepare/reserve cannot revive an older code.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fidelidade_otp_limites', 0));
  update public.otp_verificacoes set provedor = 'qr', codigo_hash = p_codigo_hash
    where id = p_id and telefone_hash = p_telefone_hash and proposito = p_proposito
      and status = 'reservado' and codigo_hash is null and expira_em > now()
      and not exists (select 1 from public.otp_verificacoes newer
        where newer.telefone_hash = p_telefone_hash and newer.proposito = p_proposito
          and newer.criado_em > otp_verificacoes.criado_em)
    returning expira_em into v_expira;
  if v_expira is null then return null; end if;
  -- Explicit resend replaces an older QR code, never extends it or reuses it.
  update public.otp_verificacoes set codigo_hash = null
    where telefone_hash = p_telefone_hash and proposito = p_proposito and provedor = 'qr'
      and id <> p_id and status in ('reservado', 'enviado', 'indeterminado');
  return pg_catalog.jsonb_build_object('expira_em', v_expira);
end;
$$;

create function public.finalizar_envio_otp_qr(p_id uuid, p_aceito boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.otp_verificacoes set status = case when p_aceito is true then 'enviado' else 'indeterminado' end
    where id = p_id and provedor = 'qr' and status = 'reservado' and codigo_hash is not null
    returning id into v_id;
  return v_id is not null;
end;
$$;

create function public.verificar_otp_qr(
  p_id uuid, p_telefone_hash text, p_proposito text, p_codigo_hash text, p_grant_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.otp_verificacoes%rowtype;
begin
  if p_codigo_hash is null or p_codigo_hash !~ '^[a-f0-9]{64}$' or
     p_grant_hash is null or p_grant_hash !~ '^[a-f0-9]{64}$' then raise exception 'Verificação OTP inválida'; end if;
  select * into v_row from public.otp_verificacoes where id = p_id for update;
  if not found or v_row.telefone_hash <> p_telefone_hash or p_telefone_hash is null or
     v_row.proposito <> p_proposito or p_proposito is null or v_row.provedor <> 'qr' or
     v_row.status not in ('enviado', 'indeterminado') or v_row.expira_em <= now() or
     v_row.tentativas >= 5 or v_row.codigo_hash is null then
    return pg_catalog.jsonb_build_object('status', 'indisponivel');
  end if;
  update public.otp_verificacoes set tentativas = tentativas + 1 where id = p_id;
  -- Candidate is an HMAC computed only by the server, not the low-entropy PIN.
  if v_row.codigo_hash <> p_codigo_hash then
    return pg_catalog.jsonb_build_object('status', 'invalido');
  end if;
  update public.otp_verificacoes set status = 'verificado', codigo_hash = null,
    grant_hash = p_grant_hash, verificado_em = now(), expira_em = now() + interval '10 minutes'
    where id = p_id;
  return pg_catalog.jsonb_build_object('status', 'verificado');
end;
$$;

-- The legacy Twilio path cannot increment attempts for QR challenges.
create or replace function public.registrar_tentativa_otp(
  p_solicitacao_id uuid, p_telefone_hash text, p_proposito text, p_max_tentativas integer default 5
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_max_tentativas is null or p_max_tentativas not between 1 and 5 then return false; end if;
  update public.otp_verificacoes set tentativas = tentativas + 1
    where id = p_solicitacao_id and telefone_hash = p_telefone_hash and proposito = p_proposito
      and provedor = 'twilio' and status = 'enviado' and expira_em > now() and tentativas < p_max_tentativas
    returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.preparar_otp_qr(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.finalizar_envio_otp_qr(uuid,boolean) from public, anon, authenticated;
revoke all on function public.verificar_otp_qr(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.preparar_otp_qr(uuid,text,text,text) to service_role;
grant execute on function public.finalizar_envio_otp_qr(uuid,boolean) to service_role;
grant execute on function public.verificar_otp_qr(uuid,text,text,text,text) to service_role;
-- Existing reserve/attempt grants remain service_role-only after replacement.
alter function public.consumir_grant_otp(text,text,text) set search_path = '';
comment on column public.otp_verificacoes.codigo_hash is 'HMAC de código vinculado ao UUID; sem telefone/código em claro, apagado na confirmação.';
commit;
