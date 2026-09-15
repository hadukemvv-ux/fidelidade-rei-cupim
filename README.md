# Projeto Fidelidade (SAIPOS + Supabase + Next.js)

Sistema de fidelidade para restaurante com:
- Pontos, cashback e tickets por compra
- Integracao com SAIPOS (webhook + cron)
- Area admin protegida por sessao
- Crons de sincronizacao e expiracao

## Estado atual (15/09/2026)

- Código recuperado e versionado no GitHub; cada push em `main` dispara deploy automático na Vercel.
- Última base publicada no Git: Roleta V2 com giro atômico e permissão explícita somente para o servidor. A V2 continua **desativada** até o fluxo completo passar por testes e aprovação comercial.
- TypeScript e lint: sem erros na última verificação. Testes unitários: `32/32` aprovados.
- Roleta: a V1 foi bloqueada. A V2 já possui sessão QR segura, tela pública por QR, giro único atômico no banco, prêmio ponderado por nível, cupom e consentimento opcional. Ela continua fechada e em modo de teste até a validação da venda pela Saipos e o piloto operacional.
- Saipos: o fluxo de validação imediata de comanda está em espera pela confirmação técnica da Saipos. Veja `docs/SAIPOS_VALIDACAO_COMANDA.md` antes de ativar qualquer operação baseada em foto.
- Sorteios legados estão pausados: não há cron de sorteio e tickets não representam entrada ou promessa futura. O plano de privacidade, contenção e resposta a incidentes está em `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`; o aviso público está em `/privacidade`.
- Último deploy confirmado como `Ready` na Vercel: commit `63ed036` (15/09/2026). O commit anterior `fd476c1` contém o modo de contenção e a pausa segura do sorteio.

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

Para privacidade, contenção e resposta a incidentes:
- `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`

Para testar as preferências do cliente e o modo de contenção sem depender de outra pessoa:
- `docs/GUIA_TESTE_PRIVACIDADE_E_CONTENCAO.md`

Roadmap vivo, com estado de cada frente:
- `docs/ROADMAP.md`

Pergunta pronta e contrato técnico necessário com a Saipos:
- `docs/SAIPOS_VALIDACAO_COMANDA.md`

Plano para substituir e remover as partes antigas, sem compatibilidade desnecessária:
- `docs/LIMPEZA_DO_LEGADO.md`

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
