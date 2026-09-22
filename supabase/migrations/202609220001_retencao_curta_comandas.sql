begin;

-- O piloto guarda somente evidência operacional mínima. A API de limpeza
-- remove os objetos privados assim que este prazo vencer.
alter table public.comandas_roleta
  alter column expira_em set default (now() + interval '36 hours');

-- Também reduz a janela das comandas ainda não eliminadas que foram criadas
-- quando o padrão era 30 dias. Não reativa objetos já apagados.
update public.comandas_roleta
set expira_em = now() + interval '36 hours'
where apagada_em is null
  and expira_em > now() + interval '36 hours';

commit;
