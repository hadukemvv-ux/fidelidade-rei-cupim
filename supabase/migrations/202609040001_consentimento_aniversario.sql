begin;

alter table public.base_clientes_saipos
  add column if not exists aceita_whatsapp_aniversario boolean not null default false,
  add column if not exists aceite_whatsapp_aniversario_em timestamptz;

comment on column public.base_clientes_saipos.aceita_whatsapp_aniversario is
  'Consentimento específico para surpresa e lembrete de aniversário via WhatsApp.';

comment on column public.base_clientes_saipos.aceite_whatsapp_aniversario_em is
  'Data e hora em que o consentimento da campanha de aniversário foi registrado.';

commit;
