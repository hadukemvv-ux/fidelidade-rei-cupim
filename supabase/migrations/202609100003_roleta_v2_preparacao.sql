begin;

alter table public.premios_roleta
  add column if not exists codigo text,
  add column if not exists versao smallint not null default 1,
  add column if not exists canal_uso text not null default 'ambos' check (canal_uso in ('presencial', 'delivery', 'ambos')),
  add column if not exists custo_estimado numeric(12,2) not null default 0,
  add column if not exists expira_em_dias integer not null default 14 check (expira_em_dias between 1 and 90),
  add column if not exists dias_semana_validos smallint[] not null default array[1,2,3,4,5]::smallint[],
  add column if not exists pesos_nivel integer[] not null default array[1,1,1,1,1]::integer[],
  add column if not exists descricao_operacional text;

create unique index if not exists premios_roleta_codigo_unique on public.premios_roleta(codigo) where codigo is not null;
create table if not exists public.roleta_configuracoes (id smallint primary key default 1 check (id = 1), versao_ativa smallint not null default 1, v2_publicada boolean not null default false, qr_expira_minutos integer not null default 10 check (qr_expira_minutos between 1 and 60), texto_consentimento_versao text not null default 'marketing-roleta-v1', atualizado_em timestamptz not null default now());
insert into public.roleta_configuracoes(id) values (1) on conflict (id) do nothing;

insert into public.premios_roleta (codigo, versao, nome, descricao_vitoria, descricao_operacional, emoji, tipo, canal_uso, custo_estimado, ativo, participa_roleta, pesos_nivel)
values
 ('frete_gratis_v2', 2, 'Taxa de entrega grátis', 'A próxima entrega é por nossa conta.', 'Uso delivery; validar área atendida e pedido direto.', '🛵', 'frete_gratis', 'delivery', 8, false, true, array[4,5,6,7,8]),
 ('sobremesa_v2', 2, 'Sobremesa do Rei', 'Escolha pudim, brownie ou dindim gourmet.', 'Validar estoque; permitir substituição equivalente.', '🍮', 'sobremesa', 'ambos', 10, false, true, array[3,4,5,6,7]),
 ('saideira_v2', 2, 'Saideira', 'Você ganhou uma cerveja.', 'Somente para maior de 18 anos; validar disponibilidade.', '🍺', 'saideira', 'presencial', 7, false, true, array[2,3,4,5,6]),
 ('expulsadeira_v2', 2, 'Expulsadeira', 'Você ganhou duas cervejas.', 'Somente para maior de 18 anos; validar disponibilidade.', '🍻', 'expulsadeira', 'presencial', 14, false, true, array[1,2,3,4,5]),
 ('desconto_presencial_10_v2', 2, '10% presencial', '10% na sua próxima compra no salão.', 'Não cumulativo; dias úteis, exceto feriados; confirmar no caixa.', '🏪', 'desconto_presencial_10', 'presencial', 12, false, true, array[3,4,5,6,7]),
 ('desconto_delivery_10_v2', 2, '10% delivery', '10% no seu próximo pedido delivery.', 'Não cumulativo; dias úteis, exceto feriados; confirmar pelo atendimento.', '📦', 'desconto_delivery_10', 'delivery', 12, false, true, array[3,4,5,6,7])
on conflict (codigo) do nothing;

alter table public.roleta_configuracoes enable row level security;
revoke all on public.roleta_configuracoes from public, anon, authenticated;
commit;
