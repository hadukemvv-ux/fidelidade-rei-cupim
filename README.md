# Projeto Fidelidade (SAIPOS + Supabase + Next.js)

Sistema de fidelidade para restaurante com:
- Pontos, cashback e benefícios por compra
- Integracao com SAIPOS (webhook + cron)
- Area admin protegida por sessao
- Crons de sincronizacao e expiracao

## Estado atual (16/09/2026)

- Código recuperado e versionado no GitHub; cada push em `main` dispara deploy automático na Vercel.
- Última base publicada no Git: Roleta V2 com giro atômico e permissão explícita somente para o servidor. A V2 continua **desativada** até o fluxo completo passar por testes e aprovação comercial.
- TypeScript e testes unitários: `32/32` aprovados na última verificação. O lint global ainda possui pendências no legado pausado; não é critério de abertura enquanto não for corrigido e reexecutado.
- Endurecimento crítico em 16/09: a migração `202609160001_hardening_critico_legado.sql` foi aplicada e verificada no Supabase; ela bloqueia RPC/tabelas/bucket legados ao navegador e transforma a baixa de cupom antigo em operação atômica auditável.
- Roleta: a V1 foi bloqueada. A V2 já possui sessão QR segura, tela pública por QR, giro único atômico no banco, prêmio ponderado por nível, cupom e consentimento opcional. Ela continua fechada e em modo de teste até a validação da venda pela Saipos e o piloto operacional.
- Saipos: o fluxo de validação imediata de comanda está em espera pela confirmação técnica da Saipos. Veja `docs/SAIPOS_VALIDACAO_COMANDA.md` antes de ativar qualquer operação baseada em foto.
- Sorteios legados estão pausados: não há cron de sorteio e tickets não representam entrada ou promessa futura. O plano de privacidade, contenção e resposta a incidentes está em `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`; o aviso público está em `/privacidade`.
- O controle antigo de garçons e alertas foi pausado: não existem mais senhas previsíveis, ranking operacional ou telas de rotina expondo telefone/IP. A equipe é administrada em `/admin/operadores`; o fluxo futuro usa QR V2 e auditoria.
- O deploy da alteração funcional `f59fd85` foi confirmado como `Ready` na Vercel em 16/09/2026; ele pausou o fluxo legado de garçons e publicou o roteiro mestre de testes. O commit `fd476c1` contém o modo de contenção e a pausa segura do sorteio.

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

## Comece por aqui

Antes de retomar o projeto em outro computador ou iniciar uma nova frente, leia:
- `docs/COMECE_AQUI.md`

## Documentacao oficial do projeto

Ponto oficial de retomada, auditoria e checklist de abertura:
- `docs/AUDITORIA_E_CONTINUIDADE_2026-09-10.md`

Auditoria técnica mais recente e checkpoint das correções de segurança:
- `docs/AUDITORIA_TECNICA_2026-09-16.md`

Para iniciantes:
- `docs/GUIA-INICIANTE.md`

Para operacao e testes:
- `docs/GUIA-OPERACAO-E-TESTES.md`

Para privacidade, contenção e resposta a incidentes:
- `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`

Para testar as preferências do cliente e o modo de contenção sem depender de outra pessoa:
- `docs/GUIA_TESTE_PRIVACIDADE_E_CONTENCAO.md`

Roteiro mestre de todos os testes pendentes antes do lançamento:
- `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`

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

Documentação histórica (somente referência; não usar como instrução de operação):
- `ARQUITETURA.md`
- `DEPLOYMENT.md`
- `IMPLEMENTACOES.md`
- `STATUS_ALPHA.md`

## Variaveis de ambiente essenciais

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SAIPOS_DATA_API_TOKEN` (Secret exclusivo da API de Consulta de Dados)
- `SAIPOS_ID`
- `CUSTOMER_SESSION_SECRET` (obrigatório e independente da chave de serviço)
- `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` (opcional, recomendado para testes)
- `CRON_SECRET`

## Seguranca basica

- Admin API usa `Authorization: Bearer <JWT da sessao Supabase>` e confere o papel ativo em `perfis_operacionais` (`caixa`, `gestor` ou `superadmin`)
- Não use allowlist de e-mail nem token administrativo compartilhado; cadastre, suspenda e audite a equipe em `/admin/operadores`
- Para a suite local, prefira `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` de um usuário de teste com papel operacional válido
- Cron API usa `Authorization: Bearer <CRON_SECRET>`
- O webhook Saipos permanece pausado até o fornecedor documentar assinatura e
  evento de venda paga; quando existir, usará `SAIPOS_WEBHOOK_SECRET` separado.
- Nunca commitar `.env.local`
