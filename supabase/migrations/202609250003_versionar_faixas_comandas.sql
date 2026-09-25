begin;

-- Regra fixada no momento da emissão; mudanças futuras não invalidam QR antigos.
alter table public.comandas_roleta
  add column if not exists regra_faixa_versao text;

-- A única emissão anterior a esta migração usou cinco faixas. Comandas ainda
-- sem QR recebem a versão atual, inclusive quando forem confirmadas depois.
update public.comandas_roleta
set regra_faixa_versao = 'v1_cinco_faixas'
where regra_faixa_versao is null and nivel_roleta is not null;
update public.comandas_roleta
set regra_faixa_versao = 'v2_seis_faixas'
where regra_faixa_versao is null;
alter table public.comandas_roleta
  alter column regra_faixa_versao set default 'v2_seis_faixas',
  alter column regra_faixa_versao set not null;
alter table public.comandas_roleta
  drop constraint if exists comandas_roleta_regra_faixa_versao_check;
alter table public.comandas_roleta
  add constraint comandas_roleta_regra_faixa_versao_check
  check (regra_faixa_versao in ('v1_cinco_faixas', 'v2_seis_faixas'));

-- Retifica apenas o falso positivo comprovado: mesmo pedido, total e
-- pagamento de R$ 220,00 na Saipos. Mantém o evento de divergência no log.
with corrigida as (
  update public.comandas_roleta
  set status = 'reconciliada',
      reconciliacao_status = 'compativel',
      reconciliacao_detalhes = reconciliacao_detalhes || jsonb_build_object(
        'motivo', null,
        'nivel_roleta_saipos', 2,
        'regra_faixa_versao', 'v1_cinco_faixas',
        'retificacao', 'faixa_historica_antes_de_seis_faixas'
      )
  where id_pedido_impresso = '878519537'
    and valor_confirmado = 220
    and nivel_roleta = 2
    and regra_faixa_versao = 'v1_cinco_faixas'
    and status = 'divergente'
    and reconciliacao_status = 'divergente'
    and reconciliacao_detalhes->>'total_saipos' = '220'
    and reconciliacao_detalhes->>'pagamento_total' = '220'
    and reconciliacao_detalhes->>'cancelada' = 'false'
    and reconciliacao_detalhes->>'motivo' = 'A faixa da roleta registrada não confere com o total retornado pela Saipos.'
  returning id
)
insert into public.administracao_eventos(entidade, entidade_id, acao, detalhes)
select 'comanda', id::text, 'reconciliacao_faixa_historica_retificada',
       jsonb_build_object('id_pedido_impresso', '878519537', 'regra_faixa_versao', 'v1_cinco_faixas')
from corrigida;

commit;
