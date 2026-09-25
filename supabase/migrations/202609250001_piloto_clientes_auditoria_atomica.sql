begin;

-- A lista do piloto e seu registro administrativo mudam na mesma transação.
-- A função só pode ser chamada pelo service_role após a API validar o operador.
create or replace function public.alterar_cliente_piloto_auditado(
  p_cliente_id bigint,
  p_habilitar boolean,
  p_actor_user_id uuid,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfis_operacionais%rowtype;
  v_cliente record;
  v_linhas integer;
begin
  if p_cliente_id is null or p_cliente_id <= 0 or p_habilitar is null
     or p_actor_user_id is null or p_actor_email is null then
    return jsonb_build_object('ok', false, 'motivo', 'invalid_input');
  end if;

  select * into v_perfil from public.perfis_operacionais
  where user_id = p_actor_user_id and ativo and papel = 'superadmin';
  if not found or lower(v_perfil.email) <> lower(p_actor_email) then
    return jsonb_build_object('ok', false, 'motivo', 'forbidden');
  end if;

  if p_habilitar then
    select nome, email into v_cliente from public.base_clientes_saipos
    where id = p_cliente_id;
    if not found then
      return jsonb_build_object('ok', false, 'motivo', 'not_found');
    end if;
    if coalesce(v_cliente.nome, '') ~* '^Cliente Teste($|[^[:alnum:]_])'
       or coalesce(v_cliente.email, '') ~* '@(teste|example)\.com$' then
      return jsonb_build_object('ok', false, 'motivo', 'fictitious_customer');
    end if;

    insert into public.piloto_clientes(cliente_id) values (p_cliente_id)
    on conflict (cliente_id) do nothing;
  else
    delete from public.piloto_clientes where cliente_id = p_cliente_id;
  end if;
  get diagnostics v_linhas = row_count;

  if v_linhas > 0 then
    insert into public.administracao_eventos(
      entidade, entidade_id, acao, actor_user_id, actor_email, detalhes
    ) values (
      'configuracao', 'piloto_clientes',
      case when p_habilitar then 'cliente_incluido_no_piloto' else 'cliente_removido_do_piloto' end,
      p_actor_user_id, v_perfil.email,
      jsonb_build_object('cliente_id', p_cliente_id, 'no_piloto', p_habilitar)
    );
  end if;

  return jsonb_build_object('ok', true, 'alterado', v_linhas > 0);
end;
$$;

revoke all on function public.alterar_cliente_piloto_auditado(bigint, boolean, uuid, text)
  from public, anon, authenticated;
grant execute on function public.alterar_cliente_piloto_auditado(bigint, boolean, uuid, text)
  to service_role;

commit;
