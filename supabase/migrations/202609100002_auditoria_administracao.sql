begin;

create table if not exists public.administracao_eventos (
  id bigint generated always as identity primary key,
  entidade text not null check (entidade in ('operador', 'garcom', 'cupom', 'feriado', 'configuracao')),
  entidade_id text not null,
  acao text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists administracao_eventos_entidade_idx
  on public.administracao_eventos(entidade, entidade_id, criado_em desc);
create index if not exists administracao_eventos_criado_idx
  on public.administracao_eventos(criado_em desc);

alter table public.administracao_eventos enable row level security;
revoke all on public.administracao_eventos from public, anon, authenticated;

commit;
