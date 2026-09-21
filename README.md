# Projeto Fidelidade (SAIPOS + Supabase + Next.js)

Sistema de fidelidade para restaurante com:
- Pontos, cashback e benefícios por compra
- Integracao com SAIPOS (webhook + cron)
- Area admin protegida por sessao
- Crons de sincronizacao e expiracao

## Estado atual (21/09/2026)

- Código recuperado e versionado no GitHub; cada push em `main` dispara deploy automático na Vercel.
- Última base funcional publicada: `f436a6d` — corrige o encaminhamento após login conforme o papel operacional. Garçom entra em `/garcom/comanda`, caixa em `/caixa`, gestor em `/admin` somente leitura e superadmin em `/admin` com escrita. A produção foi confirmada como `Ready` na Vercel em 18/09/2026.
- TypeScript e testes unitários: `40/40` aprovados na última verificação. O lint global ainda possui pendências no legado pausado; não é critério de abertura enquanto não for corrigido e reexecutado.
- Endurecimento crítico em 16/09: a migração `202609160001_hardening_critico_legado.sql` foi aplicada e verificada no Supabase; ela bloqueia RPC/tabelas/bucket legados ao navegador e transforma a baixa de cupom antigo em operação atômica auditável.
- Roleta: a V1 foi bloqueada. A V2 já possui sessão QR segura, tela pública por QR, giro único atômico no banco, prêmio ponderado por nível, cupom e consentimento opcional. A partir de 18/09 ela está **aberta somente para o piloto técnico**: `v2_publicada=true`, `v2_modo_teste=true`, QR de 10 minutos e apenas o prêmio interno de custo R$ 0,00. Nenhum prêmio comercial está ativo e nenhum cupom de teste pode ser baixado na caixa.
- Saipos: a API de Consulta foi conectada somente para leitura. O ID do Pedido impresso da Mesa 99 conciliou corretamente no dia seguinte; a disponibilidade imediata ainda não foi comprovada. O piloto segue: duas fotos privadas da comanda após o pagamento -> campos conferidos pelo operador -> QR de teste -> reconciliação posterior diária. Veja `docs/SAIPOS_VALIDACAO_COMANDA.md` antes de ativar qualquer benefício comercial.
- O cron de reconciliação está configurado para a janela de 07:00–07:59 BRT (10:00–10:59 UTC) e apenas atualiza a auditoria de comandas já registradas no fluxo novo; ele não concede ponto, cupom, prêmio ou sanção.
- Sorteios legados estão pausados: não há cron de sorteio e tickets não representam entrada ou promessa futura. O plano de privacidade, contenção e resposta a incidentes está em `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`; o aviso público está em `/privacidade`.
- O controle antigo de garçons e alertas foi pausado: não existem mais senhas previsíveis, ranking operacional ou telas de rotina expondo telefone/IP. A equipe é administrada em `/admin/operadores`; o fluxo futuro usa QR V2 e auditoria.
- O deploy da alteração funcional `f59fd85` foi confirmado como `Ready` na Vercel em 16/09/2026; ele pausou o fluxo legado de garçons e publicou o roteiro mestre de testes. O commit `fd476c1` contém o modo de contenção e a pausa segura do sorteio.

### Checkpoint operacional — 21/09/2026

- Pedido de referência confirmado posteriormente: `872482756` (Mesa 99), R$ 274,45, não cancelado e pagamento retornado pela Saipos. Isso valida o **ID do Pedido impresso** como a chave de conferência posterior.
- Duas mesas 199 fechadas após remover os itens não retornaram venda pela busca dos respectivos IDs na manhã seguinte. Isso não é uma confirmação de cancelamento: indica que fechar uma mesa sem venda pode não gerar registro consultável.
- A busca somente pelo número físico da mesa não é confiável: as mesas 50 e 200 não retornaram resultado. Para concluir como a API representa um cancelamento, é obrigatório guardar o **ID do Pedido impresso** de uma comanda realmente cancelada.
- Próximo teste controlado: uma mesa concluída, uma cancelada e uma fechada sem venda; registrar ID, valor e horário aproximado, consultar imediatamente e repetir em intervalos até a manhã seguinte. Não conceder benefício nesse teste.
- Fluxo operacional do piloto: garçom ativo fotografa cabeçalho e total; o Clube exige leitura de mesa, abertura, ID e valor; o único campo digitado é o valor para dupla conferência. Depois disso, o próprio garçom emite o QR de teste. Caixa não pode enviar comandas; gestor é somente consulta e superadmin é a única contingência administrativa. A matriz completa está em `docs/PERMISSOES_OPERACIONAIS.md`.
- O painel `/admin/operacao-roleta` consolida QR emitido, conciliações, divergências, níveis e um sinal de atenção por operador. É suporte à gestão, sem punição ou bloqueio automáticos.
- Convites da equipe levam a `/acesso/definir-senha`, onde cada pessoa cria sua senha. No Supabase, a URL precisa constar em **Authentication → URL Configuration → Redirect URLs**: `https://www.clubecupim.com.br/acesso/definir-senha`.
- A URL de redirecionamento já foi incluída e verificada no Supabase em 18/09. Convites antigos podem ter apontado à raiz; para testar, usar **Reenviar acesso** em `/admin/operadores` e abrir apenas o e-mail novo.
- O lembrete do piloto foi cancelado a pedido do responsável. Nenhum novo giro, ponto, cupom comercial ou teste de equipe foi executado após o checkpoint de 18/09; o próximo piloto permanece pendente e deve seguir o caderno de testes.
- O arquivo local `supabase/migrations/202609120001_comandas_roleta_v2.sql` é um rascunho não versionado e não faz parte da base publicada. Ele foi preservado e não deve ser aplicado, apagado ou incluído em commit sem revisão exclusiva.

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
npx tsc --noEmit
npm run test:unit
```

O build local exige as variáveis de ambiente configuradas. O lint global ainda tem
pendências no legado pausado e não substitui os testes acima.

## Comece por aqui

Antes de retomar o projeto em outro computador ou iniciar uma nova frente, leia:
- `docs/COMECE_AQUI.md`
- `docs/RETOMADA_EM_NOVO_COMPUTADOR.md`

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

Controle de acesso operacional:
- `docs/PERMISSOES_OPERACIONAIS.md`

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
- `CUSTOMER_SESSION_SECRET` (obrigatório e independente da chave de serviço)
- `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` (opcional, recomendado para testes)
- `CRON_SECRET`

## Seguranca basica

- Admin API usa `Authorization: Bearer <JWT da sessao Supabase>` e confere o papel ativo em `perfis_operacionais` (`garcom`, `caixa`, `gestor` ou `superadmin`)
- Não use allowlist de e-mail nem token administrativo compartilhado; cadastre, suspenda e audite a equipe em `/admin/operadores`
- Para a suite local, prefira `ADMIN_TEST_EMAIL` e `ADMIN_TEST_PASSWORD` de um usuário de teste com papel operacional válido
- Cron API usa `Authorization: Bearer <CRON_SECRET>`
- O webhook Saipos permanece pausado até o fornecedor documentar assinatura e
  evento de venda paga; quando existir, usará `SAIPOS_WEBHOOK_SECRET` separado.
- Nunca commitar `.env.local`
