# Projeto Fidelidade (SAIPOS + Supabase + Next.js)

Sistema de fidelidade para restaurante com:
- Pontos, cashback e tickets por compra
- Integracao com SAIPOS (webhook + cron)
- Area admin protegida por sessao
- Crons de sincronizacao e expiracao

## Estado atual

- Build: passando
- TypeScript: sem erros
- Suite de integracao: `17/17` testes aprovados
- Deploy: push em `main` publica na Vercel automaticamente

## Inicio rapido

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validacao tecnica

```bash
npm run build
npx tsc --noEmit
node tests/saipos-integration.js
```

## Documentacao oficial do projeto

Para iniciantes:
- `docs/GUIA-INICIANTE.md`

Para operacao e testes:
- `docs/GUIA-OPERACAO-E-TESTES.md`

Roadmap:
- `docs/ROADMAP.md`

Para revisao por outras IAs:
- `docs/GUIA-PARA-IA-REVIEW.md`

Documentacao historica (manter como referencia):
- `ARQUITETURA.md`
- `DEPLOYMENT.md`
- `IMPLEMENTACOES.md`
- `STATUS_ALPHA.md`

## Variaveis de ambiente essenciais

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SAIPOS_TOKEN`
- `SAIPOS_ID`
- `ADMIN_SECRET_TOKEN` (opcional, fallback legado)
- `ADMIN_ALLOWED_EMAILS` (opcional, recomendado)
- `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` (opcional, recomendado para testes)
- `CRON_SECRET`

## Seguranca basica

- Admin API usa `Authorization: Bearer <JWT da sessao Supabase>`
- Para restringir admin por e-mail, configure `ADMIN_ALLOWED_EMAILS=email1@dominio.com,email2@dominio.com`
- Para a suite local, prefira `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` de um usuario admin valido
- Cron API usa `Authorization: Bearer <CRON_SECRET>`
- Webhook SAIPOS usa `x-auth-token: <SAIPOS_TOKEN>`
- Nunca commitar `.env.local`
