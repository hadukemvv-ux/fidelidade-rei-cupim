# Guia de teste — privacidade e contenção

Atualizado em 15/09/2026. Use somente uma conta de teste. Não execute estes
passos enquanto houver cliente usando o Clube, cupom em atendimento ou piloto
operacional em andamento.

## Objetivo

Confirmar três coisas antes de abrir o programa:

1. o cliente consegue retirar autorizações de mensagem;
2. essa decisão fica registrada e permanece depois de atualizar a página;
3. um superadmin consegue interromper rotas críticas e reabrir o sistema sem
   apagar dados.

## Preparação

1. Crie ou separe uma conta identificada como teste. Nunca use o telefone de
   um cliente real.
2. Anote o telefone, nome e PIN dessa conta em local seguro. Não envie o PIN
   no WhatsApp.
3. Tenha acesso superadmin ao painel `/admin` em outra aba.
4. Confirme que a Vercel está `Ready` e que o Supabase correto é o projeto
   `asjoubgoccbvftyggunz`.

## Teste de aniversário

1. Na conta de teste, entre em `/cadastro`.
2. Informe uma data de nascimento e marque o aceite da campanha de
   aniversário. Conclua o cadastro apenas se o fluxo de confirmação estiver
   disponível no ambiente de teste.
3. Entre em `/resgate` com o telefone e o PIN da conta de teste.
4. Abra a nova aba **Privacidade**.
5. Em **Surpresa de aniversário**, escolha **Desativar aniversário**.
6. Confirme a mensagem de sucesso e atualize a página. O status deve continuar
   como “não recebe mensagens”.
7. Os pontos e o cashback devem permanecer exatamente iguais.

## Teste de promoções por WhatsApp

A Roleta V2 continua desligada, portanto não vamos produzir um aceite real de
marketing em produção somente para testar. Quando houver um piloto aprovado,
use exclusivamente a conta de teste:

1. execute o fluxo QR de teste da Roleta V2;
2. marque voluntariamente a caixa de promoções;
3. entre em `/resgate` e abra **Privacidade**;
4. escolha **Não quero mais receber**;
5. atualize a página e confirme que o status permanece desligado.

Antes de qualquer envio de campanha, confirme no Supabase que existe um evento
em `consentimentos_marketing` com `concedido = false` para a conta de teste e
que `marketing_opt_in` está `false`. O histórico não deve ser apagado: ele é a
evidência da revogação.

## Teste controlado do modo de contenção

O botão é uma parada de emergência; ele bloqueia cadastros, login/resgate,
OTP, Roleta V2, cupons e integrações críticas. A página pública e o painel de
emergência continuam acessíveis.

1. Avise a equipe para não usar o Clube durante cinco minutos.
2. No painel, abra `/admin/seguranca` com uma conta `superadmin`.
3. Escolha a gravidade, descreva “teste controlado sem cliente real” e digite
   exatamente `CONTER`.
4. Acione a contenção uma única vez. Anote o número do incidente exibido.
5. Em uma aba anônima, tente apenas abrir o fluxo de cadastro ou resgate. A
   ação deve informar indisponibilidade temporária e não criar cadastro,
   cupom, giro ou crédito.
6. Volte ao painel, confira o incidente e o evento de ativação.
7. Depois de confirmar que nenhuma informação foi criada, descreva a conclusão
   do teste, digite `REABRIR` e reabra o sistema.
8. Atualize a página do Clube e confirme que o acesso voltou ao normal.

## O que registrar ao final

- data e hora do teste;
- nome ou e-mail do superadmin que executou;
- número do incidente de teste;
- resultado de cada etapa;
- qualquer erro, captura de tela e correção feita.

Se algum passo falhar, mantenha a contenção ativa, não apague logs e registre o
fato no incidente. Não tente “consertar apagando” clientes, cupons ou eventos.
