begin;

-- Superfícies legadas não participam do piloto. O servidor continua tendo
-- acesso via service_role, mas navegador, anon e authenticated não podem ler
-- nem alterar estas tabelas diretamente.
alter table public.garcons enable row level security;
alter table public.premios_roleta enable row level security;
revoke all on table public.garcons, public.premios_roleta from public, anon, authenticated;
drop policy if exists "Acesso Total Garcons" on public.garcons;
drop policy if exists "Admin tudo" on public.premios_roleta;
drop policy if exists "Publico ver premios" on public.premios_roleta;

-- Sorteio está pausado; os arquivos históricos deixam de ser públicos e não
-- aceitam upload anônimo. Nenhum objeto é apagado nesta migração.
update storage.buckets set public = false where id = 'sorteios';
drop policy if exists "Allow reading public files rhpyjq_0" on storage.objects;
drop policy if exists "Allow uploads from client rhpyjq_0" on storage.objects;

-- A função é SECURITY DEFINER e só pode ser chamada pelo backend depois da
-- conferência do papel operacional. Revogar PUBLIC é essencial: o endpoint RPC
-- público não deve permitir que alguém invente o ator de uma validação.
revoke all on function public.usar_cupom_promocional(text, uuid, text, text, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.usar_cupom_promocional(text, uuid, text, text, text, text, uuid, text)
  to service_role;

-- O fluxo de pontos ainda em uso ganha uma baixa atômica e auditável. A coluna
-- existe em instalações antigas, mas é criada de forma idempotente para uma
-- recuperação limpa do projeto.
alter table public.resgates add column if not exists usado_em timestamptz;
alter table public.resgates enable row level security;
revoke all on table public.resgates from public, anon, authenticated;

create or replace function public.usar_resgate_legado(
  p_codigo text,
  p_actor_user_id uuid,
  p_actor_email text,
  p_origem text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resgate public.resgates%rowtype;
  v_usado_em timestamptz := now();
begin
  select * into v_resgate
  from public.resgates
  where codigo = upper(trim(p_codigo))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Código não encontrado.');
  end if;

  if v_resgate.usado_em is not null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Cupom já utilizado.',
      'usado_em', v_resgate.usado_em
    );
  end if;

  update public.resgates
  set usado_em = v_usado_em, concluido_em = v_usado_em, status = 'usado'
  where id = v_resgate.id;

  insert into public.administracao_eventos(
    entidade, entidade_id, acao, actor_user_id, actor_email, detalhes
  ) values (
    'cupom',
    v_resgate.id::text,
    'resgate_legado_utilizado',
    p_actor_user_id,
    p_actor_email,
    jsonb_build_object(
      'tipo', v_resgate.tipo,
      'premio_nome', v_resgate.premio_nome,
      'valor', v_resgate.valor,
      'origem', left(coalesce(p_origem, 'caixa'), 100)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'resgate_id', v_resgate.id,
    'tipo', v_resgate.tipo,
    'premio_nome', v_resgate.premio_nome,
    'valor', v_resgate.valor,
    'usado_em', v_usado_em
  );
end;
$$;

revoke all on function public.usar_resgate_legado(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.usar_resgate_legado(text, uuid, text, text)
  to service_role;

commit;
