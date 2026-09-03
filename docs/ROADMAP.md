# Roadmap do Projeto Fidelidade

## Objetivo

Levar o projeto de estavel em producao para operacao escalavel e facil de manter.

## Fase 1 (Atual - Estabilizacao)

Status: em andamento avancado

- [x] Endpoints admin protegidos
- [x] Endpoints cron protegidos
- [x] Integracao SAIPOS resiliente (retentativas, paginacao e recuperacao de 3 dias)
- [x] Suite de integracao automatizada
- [x] Build e TypeScript limpos
- [x] Crédito de vendas SAIPOS atômico e idempotente
- [x] Resgate atômico com auditoria
- [x] Sessão HttpOnly de cliente após validação do PIN
- [ ] Consolidar docs antigas para evitar informacao desatualizada
- [ ] Definir verificação de posse do telefone para pré-cadastros (sem ativar SMS pago sem autorização)

## Fase 2 (Confiabilidade)

- [x] Adicionar testes unitarios para regras de fidelidade
- [ ] Ampliar testes unitários para rotas e funções SQL
- [x] Adicionar retries com backoff para chamadas SAIPOS
- [x] Paginar vendas SAIPOS e usar dias civis de Sao Paulo
- [x] Impedir segredos de cron em parametros da URL
- [ ] Alertas (email/slack) para falhas em cron
- [ ] Dashboard de saude dos jobs (latencia, falhas, ultimo sucesso)

## Fase 3 (Dados e Consistencia)

- [ ] Concluir ajuste de schema do sorteio no Supabase
- [ ] Definir contrato unico para IDs de sorteio (UUID vs legado)
- [ ] Idempotencia completa para todos os fluxos de venda
- [ ] Auditoria de mudancas sensiveis (admin actions)

## Fase 4 (Escala)

- [ ] Rate limit distribuido (Redis)
- [ ] Filas para processamento de vendas em lote
- [ ] Cache de consultas frequentes
- [ ] Observabilidade (Sentry + metrics)

## Fase 5 (Produto)

- [ ] UX da area admin para operacao diaria
- [ ] Painel de KPI de fidelidade e retencao
- [ ] Guia de onboarding do operador do restaurante
- [ ] Preparacao para multi-unidade (se aplicavel)

## Criterios de pronto por fase

Uma fase so fecha quando:
- Build passa
- Testes relevantes passam
- Logs estao compreensiveis
- Documentacao da fase foi atualizada

## Ritmo de trabalho

Cada rodada deve terminar nesta ordem:

1. Uma mudanca de escopo pequeno e claro
2. Testes automatizados e build
3. Commit no GitHub
4. Deploy e verificacao externa, quando aplicavel
5. Atualizacao de `STATUS_ALPHA.md` com resultado e proxima tarefa
