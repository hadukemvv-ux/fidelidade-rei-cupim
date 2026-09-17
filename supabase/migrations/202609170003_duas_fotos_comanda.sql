begin;

-- Duas evidências complementares evitam que uma foto borrada esconda mesa,
-- horário de abertura ou valor. Ambas continuam privadas no bucket existente.
create table if not exists public.comanda_imagens (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas_roleta(id) on delete cascade,
  tipo text not null check (tipo in ('cabecalho', 'total')),
  imagem_path text not null unique,
  criado_em timestamptz not null default now(),
  unique (comanda_id, tipo)
);

alter table public.comanda_imagens enable row level security;
revoke all on public.comanda_imagens from public, anon, authenticated;

commit;
