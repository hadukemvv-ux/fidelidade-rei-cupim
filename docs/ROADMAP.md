# Roadmap do Projeto Fidelidade

## Objetivo

Levar o projeto de estavel em producao para operacao escalavel e facil de manter.

## Fase 1 (Atual - Estabilizacao)

Status: em andamento avancado

- [x] Endpoints admin protegidos
- [x] Endpoints cron protegidos
- [x] Integracao SAIPOS resiliente (nao derruba cron por venda invalida)
- [x] Suite de integracao automatizada
- [x] Build e TypeScript limpos
- [ ] Consolidar docs antigas para evitar informacao desatualizada

## Fase 2 (Confiabilidade)

- [ ] Adicionar testes unitarios para regras de fidelidade
- [ ] Adicionar retries com backoff para chamadas SAIPOS
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
