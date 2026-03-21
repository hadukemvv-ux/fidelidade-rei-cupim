# Arquitetura do Sistema de Fidelidade

Documento consolidado em 21/03/2026 para manter consistencia com os guias em `docs/`.

## Fonte oficial para leitura completa

- `docs/GUIA-INICIANTE.md`
- `docs/GUIA-OPERACAO-E-TESTES.md`
- `docs/ROADMAP.md`
- `docs/GUIA-PARA-IA-REVIEW.md`

## Resumo tecnico atual

- Stack: Next.js (App Router) + TypeScript + Supabase
- Integracao externa: SAIPOS (webhook + cron)
- Regras de negocio oficiais: `src/lib/fidelidade-rules.ts`
- Motor de processamento de venda: `src/app/api/cron/saipos/processarVenda.ts`

## Seguranca

- Admin APIs: `Authorization: Bearer <ADMIN_SECRET_TOKEN>`
- Cron APIs: `Authorization: Bearer <CRON_SECRET>`
- Webhook SAIPOS: `x-auth-token: <SAIPOS_TOKEN>`

## Fluxos criticos

1. Venda SAIPOS -> processar venda -> atualizar cliente
2. Consulta cliente -> retorna nivel/saldos
3. Resgate -> valida saldo e registra operacao
4. Sorteio -> usa `sorteios.id_new` no fluxo legado
5. Expiracao de pontos -> cron com batch updates

## Observacao importante sobre schema do sorteio

No estado atual:
- `sorteios.id` e UUID
- `sorteios.id_new` e inteiro legado
- `sorteios_ganhadores.sorteio_id` segue inteiro legado

Por isso, o codigo usa `id_new` para manter compatibilidade.

## Decisao de operacao

Este arquivo passa a ser um resumo executivo. Para detalhes de operacao e teste, usar os documentos em `docs/`.