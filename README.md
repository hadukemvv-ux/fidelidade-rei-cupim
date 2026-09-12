# Projeto Fidelidade (SAIPOS + Supabase + Next.js)

Sistema de fidelidade para restaurante com:
- Pontos, cashback e tickets por compra
- Integracao com SAIPOS (webhook + cron)
- Area admin protegida por sessao
- Crons de sincronizacao e expiracao

## Estado atual (12/09/2026)

- Código recuperado e versionado no GitHub; cada push em `main` dispara deploy automático na Vercel.
- Última base publicada no Git: gerador operacional de QR temporário da Roleta V2. A V2 continua **desativada** até o fluxo completo passar por testes e aprovação comercial.
- TypeScript: sem erros na última verificação. Testes unitários: `30/30` aprovados.
- Roleta: a V1 foi bloqueada; já existem sessões seguras de QR, com token opaco, hash no banco, expiração e auditoria. Ainda faltam a tela pública V2, o giro único, a emissão de cupom e a validação automática da venda.
- Saipos: o fluxo de validação imediata de comanda está em espera pela confirmação técnica da Saipos. Veja `docs/SAIPOS_VALIDACAO_COMANDA.md` antes de ativar qualquer operação baseada em foto.

## Inicio rapido

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Se o `npm run dev` falhar com lock da pasta `.next/dev/lock`:

```bash
npm run dev:clean
```

## Validacao tecnica

```bash
npm run build
npx tsc --noEmit
node tests/saipos-integration.js
```

## Documentacao oficial do projeto

Ponto oficial de retomada, auditoria e checklist de abertura:
- `docs/AUDITORIA_E_CONTINUIDADE_2026-09-10.md`

Para iniciantes:
- `docs/GUIA-INICIANTE.md`

Para operacao e testes:
- `docs/GUIA-OPERACAO-E-TESTES.md`

Roadmap vivo, com estado de cada frente:
- `docs/ROADMAP.md`

Pergunta pronta e contrato técnico necessário com a Saipos:
- `docs/SAIPOS_VALIDACAO_COMANDA.md`

Regras atuais do programa:
- `docs/REGRAS-FIDELIDADE.md`

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
