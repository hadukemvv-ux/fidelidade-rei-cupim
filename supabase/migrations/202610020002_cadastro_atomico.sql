-- Prepared only. Requires review and explicit production authorization.
begin;

-- Names are not identities. Drop only the confirmed legacy single-name constraint;
-- preserve phone/email/CPF uniqueness, indexes and every existing customer row.
do $$
declare v_columns text[]; v_type "char";
begin
  select c.contype, array(select a.attname::text from pg_catalog.unnest(c.conkey) k
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k)
    into v_type, v_columns from pg_catalog.pg_constraint c
    where c.conrelid='public.base_clientes_saipos'::regclass and c.conname='unique_nome';
  if found then
    if v_type <> 'u' or v_columns <> array['nome']::text[] then
      raise exception 'unique_nome inesperada: revisar catálogo antes da migração';
    end if;
    alter table public.base_clientes_saipos drop constraint unique_nome;
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint c
    where c.conrelid='public.base_clientes_saipos'::regclass and c.contype='u'
      and array(select a.attname::text from pg_catalog.unnest(c.conkey) k
        join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k)
        = array['telefone']::text[]) then
    raise exception 'Unicidade de telefone ausente: revisar catálogo';
  end if;
end;
$$;

create function public.concluir_cadastro_otp(
  p_grant_hash text, p_telefone_hash text, p_telefone text, p_nome text,
  p_email text, p_data_nascimento date, p_consentimento_aniversario boolean,
  p_pin_hash text, p_bonus_pontos integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cliente public.base_clientes_saipos%rowtype;
  v_otp public.otp_verificacoes%rowtype;
  v_contencao boolean;
  v_criado boolean;
  v_pre boolean;
  v_email text := nullif(pg_catalog.btrim(p_email), '');
  v_consentimento boolean := coalesce(p_consentimento_aniversario, false) and p_data_nascimento is not null;
begin
  if p_grant_hash is null or p_grant_hash !~ '^[a-f0-9]{64}$' or
     p_telefone_hash is null or p_telefone_hash !~ '^[a-f0-9]{64}$' or
     p_telefone is null or p_telefone !~ '^[0-9]{10,11}$' or
     p_nome is null or char_length(pg_catalog.btrim(p_nome)) not between 3 and 255 or
     pg_catalog.btrim(p_nome) = 'Cliente Novo (Roleta)' or
     p_pin_hash is null or p_pin_hash !~ '^scrypt[$]16384[$]8[$]1[$][A-Za-z0-9_-]{22}[$][A-Za-z0-9_-]{43}$' or
     p_bonus_pontos is null or p_bonus_pontos not between 0 and 10000 then
    return pg_catalog.jsonb_build_object('ok',false,'motivo','invalid');
  end if;

  -- Same containment-before-customer ordering used by benefit operations.
  select modo_contencao into v_contencao from public.seguranca_configuracoes where id=1 for share;
  if not found or v_contencao then
    return pg_catalog.jsonb_build_object('ok',false,'motivo','paused');
  end if;
  -- Serializes absent rows too. Other writers remain protected by phone uniqueness.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cadastro:' || p_telefone,0));
  select * into v_otp from public.otp_verificacoes
    where grant_hash=p_grant_hash and telefone_hash=p_telefone_hash and proposito='cadastro'
    for update;
  if not found or v_otp.status <> 'verificado' or v_otp.expira_em <= clock_timestamp() then
    return pg_catalog.jsonb_build_object('ok',false,'motivo','otp_required');
  end if;

  select * into v_cliente from public.base_clientes_saipos where telefone=p_telefone for update;
  v_criado := not found;
  if not v_criado then
    v_pre := v_cliente.nome='Cliente Novo (Roleta)' or coalesce(v_cliente.pin_hash,'')='' or
      v_cliente.pin_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.left(p_telefone,4),'UTF8')),'hex');
    if not v_pre then
      -- Never replace a complete account's PIN/profile via a signup grant.
      return pg_catalog.jsonb_build_object('ok',false,'motivo','existing_account');
    end if;
  end if;
  if v_otp.expira_em <= clock_timestamp() then
    return pg_catalog.jsonb_build_object('ok',false,'motivo','otp_required');
  end if;
  if v_email is not null and exists(select 1 from public.base_clientes_saipos
    where email=v_email and telefone<>p_telefone) then
    return pg_catalog.jsonb_build_object('ok',false,'motivo','email_conflict');
  end if;

  if v_criado then
    insert into public.base_clientes_saipos(
      nome,email,telefone,pin_hash,data_nascimento,aceita_whatsapp_aniversario,
      aceite_whatsapp_aniversario_em,telefone_verificado_em,pontos,cashback,tickets,
      nivel,total_gasto,qtd_pedidos,primeira_compra,ultima_compra,atualizado_em
    ) values (
      pg_catalog.btrim(p_nome),v_email,p_telefone,p_pin_hash,p_data_nascimento,v_consentimento,
      case when v_consentimento then now() end,now(),p_bonus_pontos,0,0,
      'BRONZE',0,0,null,null,now()
    ) returning * into v_cliente;
  else
    -- Keep imported profile, purchases and all balances; add the existing signup
    -- bonus only when transitioning from pre-signup to a protected complete account.
    update public.base_clientes_saipos set
      nome=case when nome is null or nome='' or nome='Cliente Novo (Roleta)' then pg_catalog.btrim(p_nome) else nome end,
      email=coalesce(email,v_email),data_nascimento=coalesce(data_nascimento,p_data_nascimento),
      aceita_whatsapp_aniversario=aceita_whatsapp_aniversario or v_consentimento,
      aceite_whatsapp_aniversario_em=case when v_consentimento then now() else aceite_whatsapp_aniversario_em end,
      pin_hash=p_pin_hash,telefone_verificado_em=now(),pontos=coalesce(pontos,0)+p_bonus_pontos,atualizado_em=now()
      where id=v_cliente.id returning * into v_cliente;
  end if;
  if p_bonus_pontos>0 then
    insert into public.extrato_pontos(cliente_id,tipo,valor,origem,descricao,criado_em,metodo)
      values(v_cliente.id,'entrada',p_bonus_pontos,'SISTEMA','Bônus de Cadastro',now(),'cadastro');
  end if;
  if v_otp.expira_em <= clock_timestamp() then
    raise exception 'Confirmação expirada durante o cadastro';
  end if;
  update public.otp_verificacoes set status='consumido',consumido_em=now(),grant_hash=null
    where id=v_otp.id;
  return pg_catalog.jsonb_build_object('ok',true,'criado',v_criado,'bonus',p_bonus_pontos);
exception when unique_violation then
  -- This exception subtransaction rolls back ALL writes including the grant.
  -- No database error detail (which can contain personal data) is returned.
  return pg_catalog.jsonb_build_object('ok',false,'motivo','conflict');
end;
$$;
revoke all on function public.concluir_cadastro_otp(text,text,text,text,text,date,boolean,text,integer) from public,anon,authenticated;
grant execute on function public.concluir_cadastro_otp(text,text,text,text,text,date,boolean,text,integer) to service_role;
commit;
