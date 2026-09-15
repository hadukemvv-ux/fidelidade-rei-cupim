begin;

-- O histórico em consentimentos_marketing é a evidência; estas colunas na
-- ficha do cliente servem apenas como estado atual rápido para operações que
-- precisam decidir se uma mensagem pode ou não ser enviada.
create or replace function public.sincronizar_preferencia_marketing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cliente_id is not null
    and new.finalidade = 'marketing_promocoes'
    and new.canal = 'whatsapp' then
    update public.base_clientes_saipos
    set marketing_opt_in = new.concedido,
        marketing_opt_in_em = case when new.concedido then new.criado_em else marketing_opt_in_em end,
        marketing_opt_out_em = case when new.concedido then null else new.criado_em end,
        atualizado_em = now()
    where id = new.cliente_id;
  end if;

  return new;
end;
$$;

revoke all on function public.sincronizar_preferencia_marketing() from public, anon, authenticated;

drop trigger if exists consentimentos_marketing_sincronizar_preferencia on public.consentimentos_marketing;
create trigger consentimentos_marketing_sincronizar_preferencia
after insert on public.consentimentos_marketing
for each row execute function public.sincronizar_preferencia_marketing();

commit;
