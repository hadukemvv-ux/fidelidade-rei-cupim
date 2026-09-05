begin;

create table if not exists public.piloto_clientes (
  cliente_id bigint primary key references public.base_clientes_saipos(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.limitar_clientes_piloto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('fidelidade_piloto_clientes', 0));
  if exists (select 1 from public.piloto_clientes where cliente_id = new.cliente_id) then return new; end if;
  if (select count(*) from public.piloto_clientes) >= 10 then raise exception 'PILOT_LIMIT_REACHED'; end if;
  return new;
end;
$$;

drop trigger if exists limitar_clientes_piloto_trigger on public.piloto_clientes;
create trigger limitar_clientes_piloto_trigger before insert on public.piloto_clientes
for each row execute function public.limitar_clientes_piloto();

alter table public.piloto_clientes enable row level security;
revoke all on public.piloto_clientes from public, anon, authenticated;
revoke all on function public.limitar_clientes_piloto() from public, anon, authenticated;

comment on table public.piloto_clientes is
  'Lista reversível de até 10 clientes reais convidados para o piloto controlado.';

commit;
