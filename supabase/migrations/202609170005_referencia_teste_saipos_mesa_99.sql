begin;

-- Referência operacional do piloto de reconciliação. Não armazena foto,
-- telefone, nome de cliente, CPF ou qualquer dado da venda além do mínimo
-- necessário para a futura consulta técnica.
insert into public.administracao_eventos (
  entidade, entidade_id, acao, detalhes
)
select
  'comanda',
  'saipos-piloto-mesa-99',
  'referencia_teste_saipos_registrada',
  jsonb_build_object(
    'id_pedido_impresso', '872482756',
    'mesa_referencia', '99',
    'data_operacional', '2026-09-17',
    'valor_esperado', 274.45,
    'finalidade', 'conferencia_manual_da_conexao_saipos',
    'situacao', 'aguarda_consulta_tecnica'
  )
where not exists (
    select 1
    from public.administracao_eventos evento
    where evento.entidade = 'comanda'
      and evento.entidade_id = 'saipos-piloto-mesa-99'
      and evento.acao = 'referencia_teste_saipos_registrada'
  )
limit 1;

commit;
