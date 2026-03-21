# Deployment Guide (Atualizado)

Documento consolidado em 21/03/2026.

## Referencias oficiais

- `README.md` (entrada principal)
- `docs/GUIA-INICIANTE.md`
- `docs/GUIA-OPERACAO-E-TESTES.md`

## Checklist de deploy

1. Confirmar variaveis no ambiente (Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SAIPOS_TOKEN`
   - `SAIPOS_ID`
   - `ADMIN_SECRET_TOKEN`
   - `ADMIN_ALLOWED_EMAILS` (opcional, recomendado)
   - `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` (opcional, recomendado para testes locais)
   - `CRON_SECRET`

2. Validacao local antes do push:
   - `npm run build`
   - `npx tsc --noEmit`
   - `node tests/saipos-integration.js`

3. Push em `main` para deploy automatico na Vercel.

## Crons configurados

Arquivo: `vercel.json`

- `/api/cron/expirar-pontos`
- `/api/cron/saipos`
- `/api/cron/sorteio`

Todos exigem `CRON_SECRET` no header ou query.

## SQL opcional de ajuste

Se precisar ajustar relacionamento de `cliente_id` em `sorteios_ganhadores`, use:

- `supabase/migrations/fix_sorteios_ganhadores_types.sql`

No Supabase SQL Editor, cole o conteudo do arquivo (nao o caminho).

## Pos-deploy

- Validar suite: `node tests/saipos-integration.js`
- Monitorar logs de cron SAIPOS
- Confirmar retorno 200 em endpoints criticos