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

Na etapa de 28/09 ainda não existia conexão QR ativa/persistente nem worker de envio;
o piloto posterior está descrito abaixo. Continuam pendentes processador de respostas,
vínculo de celular do operador, painel de baixas reais, catálogo de itens físicos
e integração com o giro. Não habilitar o webhook
antes de aplicar/revisar a inbox e concluir o consumidor autenticado.

## Escolha de canal — ensaio aprovado em 29/09

O responsável confirmou número separado ativado, recebendo SMS/ligações,
e escolheu avaliar conexão não oficial por QR após aviso dos riscos.
A finalidade é um número de verificação e avisos do próprio Clube, não um
chatbot de conversa. Isso não muda a natureza da conexão nem elimina risco
de bloqueio/desconexão. Não conectar o WhatsApp pessoal.

A decisão anterior de provedor oficial foi substituída apenas para este ensaio
isolado. Baileys é integração não oficial e sua sessão tem acesso à conta.
Não concluir que a Saipos usa essa tecnologia sem confirmação do fornecedor.
`services/whatsapp-qr` é um pacote independente, sem importação pelo Next,
sem sincronização de histórico ou integração com o cadastro/OTP.
O ensaio `connect.mjs` usa somente memória; o responsável confirmou pareamento.
Para a continuação autorizada em 29/09, `serve.mjs` prepara persistência
criptografada fora do Git e controle autenticado via API superadmin. Ainda precisa
de configuração, tela do Claude e ensaios reais naquela etapa. Contrato e
execução estão no README; o serviço não é iniciado pelo deploy da Vercel.

O primeiro ensaio aprovado será isolado/local, sem leitura/importação de
conversas, sem grupos, sem campanhas, sem clientes reais e somente destinos
de teste autorizados. Não rodar sessão permanente em Route Handler Vercel;
o processo precisa de máquina/serviço contínuo, credenciais privadas fora do
Git, parada imediata e restrição de acesso ao QR.

Atualização em 30/09: worker Oracle/HTTPS e painel superadmin publicados; número
dedicado pareado e reconexão após reinício validada sem novo QR. Primeiro envio
foi informado como não recebido; consulta confirmou endereço interno divergente.
Resolução pelo WhatsApp corrigida, sem alterar cadastro/remover dígitos cegamente.
Responsável autorizou outro ensaio e confirmou recebimento com print depois dele.
UUID privado limita a tentativa adicional; os dois registros foram preservados.
Envios desligados depois do teste, destino/autorização temporários removidos.
Rota de envio só em loopback; código do piloto está na branch, sem publicação na main.
Modelos em `src/lib/whatsappMessageCatalog.ts` são apenas rascunhos, sem fila/gatilho.
Não confundir aviso ao garçom com entrega/baixa ou conexão com telefone comprovado.

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

1. Realizar pareamento do número separado no ensaio aprovado por QR e conferir
   encerramento/desvinculação no celular; depois autorizar destinos de teste
   antes de implementar envios. Não expor números, QR ou segredos em Git/chat.
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

Ao retomar, seguir o caderno `docs/referencia/TESTES_PENDENTES_PRE_LANCAMENTO.md`, registrar
resultado do ensaio e continuar pelos próximos passos acima. Não confundir
commit/push de código com migração aplicada, canal ativado ou lançamento comercial.

Publicação posterior em 28/09: `2cb51fe` enviado ao GitHub e Ready na Vercel
(`AaLbabwUMTSFsMK6rRvrdMNksJGN`). Ensaio desktop em `/admin/baixas` verificou
escolha sem saída, expulsadeira de 2, baixa sem duplicar total e alerta 73h
mantendo pendência. Inspeção visual identificou override legado de cor dos
botões; correção isolada em CSS Module incluída nesta entrega. Celular e
demais cenários manuais ainda pendentes. Isso substitui o estado de publicação
pendente acima, não a ausência de integração/migração/WhatsApp reais.

Referências: [Baileys](https://github.com/WhiskeySockets/Baileys),
[whatsapp-web.js](https://wwebjs.dev/guide/),
[termos WhatsApp](https://www.whatsapp.com/legal/terms-of-service),
[preços oficiais](https://whatsappbusiness.com/products/platform-pricing/).
