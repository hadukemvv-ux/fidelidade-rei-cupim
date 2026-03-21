# Guia para IA Revisar o Projeto

Este arquivo da contexto para outra IA analisar o repositorio com qualidade.

## 1. Escopo do sistema

Aplicacao Next.js (App Router) para fidelidade de restaurante com integracao SAIPOS e Supabase.

## 2. Regras de negocio (fonte oficial)

Use `src/lib/fidelidade-rules.ts` como single source of truth.

Nao considere calculos duplicados fora desse arquivo como fonte principal.

## 3. Endpoints sensiveis

- Admin: `src/app/api/admin/**` (token admin)
- Cron: `src/app/api/cron/**` (token cron)
- Webhook SAIPOS: `src/app/api/webhooks/saipos/route.ts`

## 4. Fluxos criticos para auditar

1. Idempotencia de vendas (`saipos_pedidos_processados`)
2. Integridade de pontos/cashback/tickets
3. Seguranca de autenticao admin/cron
4. Resiliencia contra falha de uma venda individual
5. Consistencia de tipos entre codigo e schema Supabase

## 5. Pontos de atencao conhecidos

- Tabela `sorteios` usa `id` UUID e `id_new` inteiro legado.
- `sorteios_ganhadores.sorteio_id` no legado usa inteiro.
- `cliente_id` em ganhadores pode ser `null` ate migracao opcional.

## 6. Evidencia atual de qualidade

- Build passando (`npm run build`)
- TypeScript sem erros (`npx tsc --noEmit`)
- Suite de integracao passando (`tests/saipos-integration.js`, 16/16)

## 7. O que uma IA deveria revisar agora

- Contrato de dados entre SAIPOS payload e `processarVenda`
- Cobertura de testes unitarios para regras de fidelidade
- Eventual refactor para padronizar IDs de sorteio
- Eliminacao de `any` onde viavel

## 8. Prompt sugerido para outra IA

"Analise este repositorio Next.js de fidelidade ponta a ponta. Priorize bugs de consistencia de dados, seguranca de auth, regressao de fluxo de vendas SAIPOS e riscos de schema mismatch no sorteio. Traga findings por severidade com arquivo/linha e recomendacoes praticas."