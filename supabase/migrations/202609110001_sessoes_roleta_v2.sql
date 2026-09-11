begin;

-- Uma sessão é criada pelo operador antes de exibir o QR ao cliente. O QR
-- carrega apenas o token opaco; valor da comanda e nível nunca saem do servidor.
create table if not exists public.roleta_sessoes (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  status text not null default 'criada' check (status in ('criada', 'aberta', 'girada', 'expirada', 'cancelada')),
  nivel smallint not null check (nivel between 1 and 5),
  valor_comanda numeric(12,2) not null check (valor_comanda >= 0),
  mesa_referencia text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_por_nome text,
  expira_em timestamptz not null,
  aberta_em timestamptz,
  girada_em timestamptz,
  cancelada_em timestamptz,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  check (expira_em > criado_em)
);

create table if not exists public.roleta_giros (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null unique references public.roleta_sessoes(id) on delete restrict,
  cliente_id bigint references public.base_clientes_saipos(id) on delete set null,
  telefone_hash text not null,
  consentimento_marketing boolean not null default false,
  consentimento_versao text,
  premio_id bigint references public.premios_roleta(id) on delete set null,
  cupom_id uuid unique references public.cupons_promocionais(id) on delete set null,
  aleatorio numeric(20,18) not null check (aleatorio >= 0 and aleatorio < 1),
  criado_em timestamptz not null default now()
);

create index if not exists roleta_sessoes_status_expira_idx on public.roleta_sessoes(status, expira_em);
create index if not exists roleta_giros_cliente_idx on public.roleta_giros(cliente_id, criado_em desc);

alter table public.roleta_sessoes enable row level security;
alter table public.roleta_giros enable row level security;
revoke all on public.roleta_sessoes, public.roleta_giros from public, anon, authenticated;

commit;
