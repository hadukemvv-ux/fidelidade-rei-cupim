# Bot e registro de entregas — 28/09/2026

## Regra operacional confirmada pelo responsável

- Conta paga -> garçom fotografa e emite QR -> cliente gira -> benefício
  imediato abre pendência para o operador responsável pelo QR.
- Saideira = 1 cerveja; expulsadeira = 2 cervejas. O cliente escolhe entre as
  cervejas que consumiu, independentemente do preço. Registrar marca, tamanho,
  produto e unidade exatos, não apenas o nome genérico do prêmio.
- Sobremesa = 1 brownie, dindim gourmet ou pudim; registrar opção/sabor exato
  se isso distinguir os itens usados na contagem da empresa.
- Resposta do garçom identifica o item. A confirmação de entrega gera UMA
  saída auditada. Sorteio, mensagem enviada ou escolha ainda não são entrega.
- Prêmio imediato não exige cadastro completo do cliente. Prêmio futuro
  permanece reservado até telefone comprovado e conta concluída.
- Admin deve mostrar pendências, entregas e totais diários para baixa manual
  na Saipos; não será um segundo sistema de saldos de estoque.

## O que foi preparado localmente (não conectado/publicado)

- Regras puras/testadas para filtrar cervejas consumidas e quantidade 1/2;
  o catálogo/opções e a composição da conta devem vir do servidor.
- Adaptador independente de canal para primeiro teste na Cloud API: somente
  `hello_world`, modo test, lista fechada e nenhum reenvio cego se resultado
  for incerto. Não envia OTP e não substitui Twilio Verify já preparado.
- Webhook Meta com handshake, assinatura HMAC dos bytes originais, limite de
  corpo, filtro de remetente/conta e escolha opaca; descarta texto/nome/mídia.
- Inbox SQL idempotente (migração **não aplicada**). Falha de persistência
  retorna 503; recebimento não confirma entrega nem dá baixa de cupom.
- Os testes usam transporte simulado; nenhuma mensagem foi enviada.
- `/admin/baixas`: ensaio somente em memória do navegador, com produtos,
  mesas e operador fictícios. Permite escolher item, confirmar entrega,
  simular lançamento manual, consultar histórico e totais diários (UTC−3).
  Seleção não soma saída; entrega/baixa repetidas são rejeitadas. Pendência
  de 73h demonstra alerta sem exclusão. Recarregar/sair descarta o ensaio.
  Não lê clientes/catálogo real, não altera cupons nem chama a Saipos.

Não existe ainda conexão QR, processo WhatsApp Web, worker de envio,
processador de respostas, vínculo de celular do operador, painel de baixas reais,
catálogo de itens físicos nem integração com o giro. Não habilitar o webhook
antes de aplicar/revisar a inbox e concluir o consumidor autenticado.

## Escolha de canal em aberto

O responsável decidiu aguardar um número separado e não conectar seu
WhatsApp pessoal. Enquanto isso, validar o fluxo pelo simulador sem mensagens.
O canal definitivo continua em aberto; não contratar provedor nem conectar
sessão automaticamente. Um número separado não elimina risco de bloqueio.

A decisão anterior do projeto era usar apenas provedor oficial. A nova rota
por WhatsApp Web exige confirmação informada: Baileys/whatsapp-web.js são
integrações não oficiais, com risco de bloqueio/desconexão e acesso de sessão
à conta. Não concluir que o QR da Saipos usa essa tecnologia sem confirmação
do fornecedor. Nenhuma dependência não oficial foi instalada ou conectada.

Se aprovada, o primeiro ensaio será isolado/local, sem leitura/importação de
conversas, sem grupos, sem campanhas, sem clientes reais e somente destinos
de teste autorizados. Não rodar sessão permanente em Route Handler Vercel;
o processo precisa de máquina/serviço contínuo, credenciais privadas fora do
Git, parada imediata e restrição de acesso ao QR.

O núcleo de entregas independe do número, mas mudar remetente exige nova
autenticação/sessão e revalidar permissões. Botões/listas de API oficial não
são promessa de funcionamento idêntico em WhatsApp Web; alternativa é
seleção numerada determinística ou formulário autenticado.

## Retenção e pendências

- Responsável solicitou janela de 72 horas para baixas recentes.
- Separar mensagem transitória da evidência de entrega/lançamento na Saipos.
- Após 72h, pendência é vencida para gestão; não apagar sem resolver.
- Prazo final do histórico enxuto e resumo diário ainda precisa de aprovação.
- Não aplicar qualquer auto-delete nesta etapa; a futura limpeza não pode
  remover a prevenção de entrega duplicada ou ocultar baixa não lançada.

## Próximos passos

1. Aguardar número separado, aprovar canal e riscos; definir remetente/destinos de teste sem expor
   números ou segredos em Git, relatórios ou chat.
2. Cadastrar o celular do garçom com comprovação, vínculo ao perfil ativo e
   aceite operacional; expansão de permissões explicitamente auditada.
3. Criar catálogo físico mínimo e mapear cervejas consumidas. Não tratar OCR
   como prova infalível nem oferecer todas as cervejas se a conta não listar.
4. Vincular giro, cupom, operador e escolhas numa pendência atômica;
   respostas duplicadas/reordenadas e operador suspenso não geram baixa.
5. Construir confirmação de entrega e painel/fechamento de baixas; registrar
   lançamento manual na Saipos e correções sem excluir histórico.
6. Simular os papéis em contas distintas com a esposa antes de ativar reais.

## Mapa técnico e instruções de continuidade

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/prizeDeliveryRules.ts` | Opções elegíveis, produto/unidade e quantidade 1/2; alerta 72h |
| `src/lib/prizeDeliverySimulation.ts` | Transições fictícias e agrupamento pela data da entrega em Fortaleza |
| `src/app/admin/baixas/page.tsx` | Ensaio em memória dentro do admin; sem API de alteração |
| `src/lib/whatsappBotCore.ts` | Configuração fail-closed, assinatura, filtro beta e transporte experimental Meta |
| `src/lib/whatsappBotWebhook.ts` | Handshake e recebimento limitado/assinado; ACK após persistência |
| `src/app/api/whatsapp/webhook/route.ts` | Rota preparada e integração com contenção/inbox; não habilitada |
| `supabase/migrations/202609280001_whatsapp_bot_inbox.sql` | Proposta de inbox idempotente e restrita a serviço; NÃO aplicada |
| `scripts/whatsapp-smoke.mts` | Envio manual experimental de um template fixo; NÃO executado |
| `tests/whatsapp-bot.test.mts` e `tests/prize-delivery-simulation.test.mts` | Regressão isolada sem transporte/banco reais |

### Configuração (não habilitar nesta etapa)

`.env.example` documenta `WHATSAPP_BOT_MODE=disabled` e os nomes opcionais
`WHATSAPP_META_PHONE_NUMBER_ID`, `WHATSAPP_META_ACCESS_TOKEN`,
`WHATSAPP_META_API_VERSION`, `WHATSAPP_META_APP_SECRET`,
`WHATSAPP_META_VERIFY_TOKEN`, `WHATSAPP_BOT_IDENTIFIER_SECRET` e
`WHATSAPP_BOT_TEST_RECIPIENTS`. Qualquer modo diferente de `test` é tratado
como desligado; não há modo de produção implementado. Não versionar valores.

O script exige `--send` explícito e `WHATSAPP_BOT_SMOKE_RECIPIENT` no ambiente,
mas **não deve ser executado enquanto aguardamos número e canal aprovado**.
Não há fila automática, retry de envio ou cron do bot. Destinos precisam estar
na lista beta; o template `hello_world` não representa o fluxo operacional final.

### Evidências e limites desta entrega

Em 28/09: 84/84 testes, TypeScript, lint dos arquivos alterados e build local
aprovados. Ambiente do build fictício. Nenhuma aplicação de SQL, mensagem,
conexão QR ou baixa real ocorreu. Verificação visual/manual e deploy desta
etapa ainda pendentes. A suíte não substitui teste de RLS/RPC em banco isolado.

Hashes de remetente e IDs da inbox são dados pseudonimizados, não anonimização
garantida: devem entrar no inventário/controle de acesso e na retenção aprovada.
O exemplo browser-only não possui atomicidade entre dispositivos e não pode
ser adaptado a estoque/cupom real sem transação, autorização e auditoria no servidor.

Ao retomar, seguir o caderno `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`, registrar
resultado do ensaio e continuar pelos próximos passos acima. Não confundir
commit/push de código com migração aplicada, canal ativado ou lançamento comercial.

Referências: [Baileys](https://github.com/WhiskeySockets/Baileys),
[whatsapp-web.js](https://wwebjs.dev/guide/),
[termos WhatsApp](https://www.whatsapp.com/legal/terms-of-service),
[preços oficiais](https://whatsappbusiness.com/products/platform-pricing/).
