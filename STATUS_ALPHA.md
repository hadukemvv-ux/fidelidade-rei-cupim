# Status Alpha (Consolidado)

Atualizado em 03/09/2026.

## Resultado tecnico

- Build: OK
- TypeScript: OK
- Integracao SAIPOS: OK
- Testes unitarios locais: 8/8
- Suite de integracao com servicos externos: nao executada neste checkpoint

## Maturidade atual

- Seguranca basica pronta (admin/cron/webhook)
- Fluxo de venda SAIPOS atomico e idempotente
- Resgate atomico com auditoria
- Sessao de cliente assinada e armazenada em cookie HttpOnly
- RLS ativo nas tabelas operacionais e acesso publico direto bloqueado
- Frontend e backend usam a mesma fonte de regras de fidelidade
- Migrations `202609020001`, `202609020002`, `202609020003` e `202609030001` aplicadas no Supabase
- Crons operacionais com tratamento de falhas
- Documentacao base pronta para iniciante e para IA

## Riscos abertos (nao bloqueantes)

1. Pre-cadastros ainda precisam de um fluxo de verificacao de posse do telefone; nenhum SMS pago foi ativado
2. A janela movel de 90 dias ainda precisa de backfill historico confiavel da Saipos
3. Contrato de schema do sorteio ainda legado (UUID + id_new)
4. Necessidade de evolucao de observabilidade (alertas e metricas)
5. Cobertura de testes unitarios ainda pode crescer

## Proximo foco

- Fase de Confiabilidade (ver `docs/ROADMAP.md`)
- Consolidacao de contratos de dados
- Melhorias de monitoramento de producao

## Onde acompanhar o plano

- `docs/ROADMAP.md`
- `docs/GUIA-OPERACAO-E-TESTES.md`
