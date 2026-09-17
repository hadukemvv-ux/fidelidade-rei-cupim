begin;

-- Papéis de trabalho: quem registra a foto não pode conferir nem liberar a roleta.
alter table public.perfis_operacionais
  drop constraint if exists perfis_operacionais_papel_check;
alter table public.perfis_operacionais
  add constraint perfis_operacionais_papel_check
  check (papel in ('superadmin', 'gestor', 'caixa', 'garcom'));

-- A foto de uma comanda pode conter dados pessoais. O bucket é privado e
-- somente a API de servidor (service role) poderá ler ou gravar seus objetos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comandas-roleta', 'comandas-roleta', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.comandas_roleta (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'enviada'
    check (status in ('enviada', 'em_analise', 'confirmada', 'rejeitada', 'cancelada')),
  imagem_path text not null unique,
  mesa_referencia text not null,
  valor_informado numeric(12,2) check (valor_informado >= 0),
  saipos_sale_id text unique,
  criado_por uuid references auth.users(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  revisada_por uuid references auth.users(id) on delete set null,
  revisada_por_nome text,
  revisada_em timestamptz,
  motivo_revisao text,
  expira_em timestamptz not null default (now() + interval '30 days'),
  apagada_em timestamptz,
  check (expira_em > criado_em)
);

create index if not exists comandas_roleta_status_idx
  on public.comandas_roleta(status, criado_em desc);
create index if not exists comandas_roleta_expira_idx
  on public.comandas_roleta(expira_em) where apagada_em is null;

alter table public.comandas_roleta enable row level security;
revoke all on public.comandas_roleta from public, anon, authenticated;

alter table public.administracao_eventos
  drop constraint if exists administracao_eventos_entidade_check;
alter table public.administracao_eventos
  add constraint administracao_eventos_entidade_check
  check (entidade in ('operador', 'garcom', 'cupom', 'feriado', 'configuracao', 'comanda'));

commit;
