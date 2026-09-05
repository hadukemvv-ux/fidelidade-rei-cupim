alter table public.premios_roleta
  add column if not exists participa_roleta boolean not null default true;

-- Preserva a regra existente: o prêmio especial não participa da roleta diária.
update public.premios_roleta
set participa_roleta = false
where lower(nome) like '%playstation%';

comment on column public.premios_roleta.participa_roleta is
  'Define se o prêmio participa da roleta diária; independente de estar ativo no catálogo.';
