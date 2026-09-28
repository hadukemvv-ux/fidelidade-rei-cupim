-- PREPARAÇÃO: não aplicada em produção. Não habilitar o bot antes da validação.
begin;

create table public.whatsapp_bot_respostas (
  message_id text primary key check (length(message_id) between 1 and 256),
  sender_hash text not null check (sender_hash ~ '^[a-f0-9]{64}$'),
  choice_hash text not null check (choice_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pendente' check (status in ('pendente', 'processada', 'recusada')),
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  check ((status = 'pendente' and processado_em is null) or (status <> 'pendente' and processado_em is not null))
);
alter table public.whatsapp_bot_respostas enable row level security;
revoke all on public.whatsapp_bot_respostas from public, anon, authenticated;
grant select, insert, update on public.whatsapp_bot_respostas to service_role;
create index whatsapp_bot_respostas_pendentes on public.whatsapp_bot_respostas(recebido_em) where status = 'pendente';

create function public.receber_respostas_whatsapp_bot(p_respostas jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_respostas) <> 'array' or jsonb_array_length(p_respostas) > 50 then
    raise exception 'Lote inválido';
  end if;
  insert into public.whatsapp_bot_respostas(message_id, sender_hash, choice_hash)
  select r.message_id, r.sender_hash, r.choice_hash
  from jsonb_to_recordset(p_respostas) as r(message_id text, sender_hash text, choice_hash text)
  on conflict (message_id) do nothing;
end;
$$;
revoke all on function public.receber_respostas_whatsapp_bot(jsonb) from public, anon, authenticated;
grant execute on function public.receber_respostas_whatsapp_bot(jsonb) to service_role;

-- Nenhum job apaga respostas pendentes. Retenção/limpeza depende do processador
-- transacional de entregas; eventos de baixa não são a inbox de mensagens.
commit;
