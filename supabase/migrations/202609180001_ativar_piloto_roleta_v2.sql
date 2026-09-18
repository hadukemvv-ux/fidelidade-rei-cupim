begin;

-- O piloto precisa validar QR, telefone, giro único e cupom sem criar um
-- benefício comercial. Somente este prêmio interno participa da V2 enquanto
-- v2_modo_teste estiver ligado; todos os prêmios comerciais permanecem
-- inativos.
update public.premios_roleta
set ativo = false
where versao = 2;

update public.premios_roleta set
  nome = 'Prêmio de teste',
  descricao_vitoria = 'Giro registrado com sucesso.',
  descricao_operacional = 'Sem valor comercial. Não validar, usar ou oferecer ao cliente.',
  emoji = '🧪', cor = '#64748b', tipo = 'frete_gratis', canal_uso = 'ambos',
  custo_estimado = 0, expira_em_dias = 1,
  dias_semana_validos = array[1,2,3,4,5]::smallint[],
  ativo = true, participa_roleta = true, pesos_nivel = array[1,1,1,1,1]
where codigo = 'piloto_interno_sem_valor_v2';

insert into public.premios_roleta (
  codigo, versao, nome, descricao_vitoria, descricao_operacional, emoji, cor,
  tipo, canal_uso, custo_estimado, expira_em_dias, dias_semana_validos,
  ativo, participa_roleta, pesos_nivel
)
select
  'piloto_interno_sem_valor_v2', 2,
  'Prêmio de teste',
  'Giro registrado com sucesso.',
  'Sem valor comercial. Não validar, usar ou oferecer ao cliente.',
  '🧪', '#64748b', 'frete_gratis', 'ambos', 0, 1,
  array[1,2,3,4,5]::smallint[], true, true, array[1,1,1,1,1]
where not exists (
  select 1 from public.premios_roleta where codigo = 'piloto_interno_sem_valor_v2'
);

update public.roleta_configuracoes
set v2_publicada = true,
    v2_modo_teste = true,
    qr_expira_minutos = 10,
    atualizado_em = now()
where id = 1;

insert into public.administracao_eventos (entidade, entidade_id, acao, detalhes)
values (
  'configuracao', 'roleta-v2-piloto', 'piloto_roleta_v2_ativado',
  jsonb_build_object(
    'modo_teste', true,
    'premio', 'piloto_interno_sem_valor_v2',
    'beneficio_comercial', false,
    'finalidade', 'validar_comanda_qr_giro_e_reconciliacao'
  )
);

commit;
