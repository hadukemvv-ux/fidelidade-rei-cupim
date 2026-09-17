# Consulta técnica à Saipos — validação de venda para Roleta V2

Atualizado em 12/09/2026. Este documento bloqueia a automação de liberação da roleta até haver resposta técnica da Saipos.

## Contexto para a Saipos

O Clube Cupim está criando um programa de fidelidade. Depois que uma mesa é paga, o cliente deve poder ler um QR Code e receber uma chance única de jogar uma roleta promocional. Não podemos confiar apenas na foto de uma comanda: precisamos confirmar, no nosso servidor e em tempo quase real, que aquela venda foi realmente fechada/paga e que ainda não gerou uma sessão de roleta.

Não precisamos que a Saipos conceda desconto nem crie cupom. Nosso sistema apenas precisa consultar ou receber o evento de uma venda para decidir se libera um QR de uso único. Guardaremos o identificador externo da venda para impedir duplicidade.

## Mensagem pronta para enviar

> Olá, pessoal da Saipos! Somos o restaurante O Rei do Cupim e estamos desenvolvendo um programa de fidelidade próprio integrado ao nosso sistema Saipos. Precisamos confirmar automaticamente que uma venda de mesa/delivery foi realmente paga antes de liberar um QR Code promocional de uso único ao cliente. A foto da comanda será somente apoio visual; a aprovação precisa vir da Saipos.
>
> Vocês oferecem uma API ou webhook para receber em tempo real a mudança de status de uma venda para paga/finalizada? Caso exista, poderiam enviar a documentação, exemplo de payload e o método de autenticação/assinatura do webhook?
>
> Se não houver webhook, existe endpoint para consultar uma venda individual imediatamente por ID do pedido, número da comanda/mesa, NFC-e/cupom fiscal ou outro identificador único? Precisamos que a resposta informe ao menos: ID único e imutável da venda, data/hora, status de pagamento/finalização, valor total, origem (salão/delivery), mesa/comanda quando existir, cancelamento/estorno e, se disponível, telefone do cliente.
>
> Também precisamos saber como a API informa estes cenários: pagamento dividido, reabertura de mesa, cancelamento posterior, estorno, desconto, duplicidade de evento e alteração de valor. Há ambiente de homologação/sandbox, limites de requisição e algum custo adicional para webhooks ou consultas individuais?
>
> A integração será feita por servidor, nunca pelo navegador do cliente. Podem informar como criar/rotacionar as credenciais e se existe IP allowlist, token de webhook ou assinatura HMAC para validarmos a origem dos eventos? Agradecemos também um contato técnico para teste de ponta a ponta.

## Resposta mínima aceitável

Para liberar QR automaticamente na hora do pagamento, precisamos de **uma** das opções abaixo:

1. Webhook confiável de venda `paga`/`finalizada`, com ID único, assinatura/autenticação e eventos de cancelamento/estorno; ou
2. Consulta individual, autenticada e confiável, de uma venda específica usando identificador único presente na comanda/nota.

Se a Saipos só fornecer exportação ou busca em lote noturna, isso serve para pontuação/histórico, mas não para liberar a roleta de uma mesa no momento do pagamento. Nesse caso, o QR ficará pendente até a sincronização ou exigirá aprovação humana.

## Informações para registrar quando responderem

- Nome do recurso/evento e URL base da API.
- Método de autenticação e como rotacionar segredo/token.
- Exemplo de request/response ou payload real anonimizado.
- Campo que é o ID externo imutável da venda.
- Status exatos que significam paga, cancelada, estornada e em aberto.
- Campos de valor, mesa/comanda, data/hora, canal e telefone.
- Política de reenvio/duplicidade do webhook, timeout e rate limit.
- Sandbox/homologação, custos e pessoa de suporte técnico.
- Requisitos de LGPD/contrato para o uso dos campos de cliente.

## Decisão de implementação

Somente após receber e validar essas informações vamos escolher o conector da Saipos. A foto de comanda pode permanecer como anexo privado de apoio operacional, mas nunca será a única prova para emissão automática de QR ou prêmio.

## Atualização de suporte — 17/09/2026

A Saipos confirmou que a API de Consulta de Dados é **pull**: o Clube deve
consultar a API por período. Não há webhook ou evento em tempo real indicado.
Isso torna possível uma consulta sob demanda depois do fechamento da mesa, mas
ainda exige prova prática de latência e dos campos que caracterizam uma venda
efetivamente paga, cancelada ou estornada.

Uma imagem da comanda pode ser recebida como evidência de apoio, ligada ao
garçom, data/hora e referência da mesa. Ela **não** libera QR, pontos, cupom ou
prêmio por si só: foto pode ser editada, reutilizada ou estar associada a uma
venda ainda aberta. O desenho seguro é:

1. Garçom registra mesa/comanda, horário e, se necessário, foto privada.
2. Sistema consulta a Saipos em uma janela curta por `updated_at` ou outro
   campo confirmado e tenta localizar a venda correspondente.
3. Enquanto não houver confirmação, o QR fica `pendente` e não permite giro.
4. Após confirmação, uma sessão QR única é emitida; se não confirmar, expira.
5. Reconciliações posteriores só geram alerta e bloqueio preventivo do acesso
   operacional. Um gestor analisa a evidência antes de atribuir fraude ou
   aplicar qualquer consequência ao garçom.

## Prova de conceito segura — token da API de Dados

Durante a prova de conceito, o cron diário, webhook e importações legadas foram
pausados para impedir que uma consulta à API crie clientes, pontos ou benefícios
reais. Com um token já contratado, um `superadmin` deve abrir `/admin/saipos` e
consultar o dia de uma venda própria de teste. A tela não grava no Supabase e
não mostra nome, telefone, CPF, endereço ou payload completo.

Quando a mesa ou comanda for conhecida, ela pode ser informada no teste para
retornar somente a referência operacional correspondente. A busca percorre no
máximo 1.000 vendas do dia apenas em memória, sem gravar os dados recebidos.

Antes do teste, a Vercel deve ter `SAIPOS_DATA_API_TOKEN` como Secret em
Production. O endpoint oficial de vendas associa a(s) loja(s) ao token, sem o
parâmetro `p_store`; o sistema não reutiliza esse token para webhook.

### Resultado registrado — 17/09/2026, Mesa 99 antes do pagamento

- A consulta protegida de leitura foi executada para a referência `99`.
- O Clube conseguiu chamar a API de Dados, mas a Saipos devolveu **HTTP 401**.
- Nenhum dado de venda foi retornado; nenhum cliente, ponto, QR, cupom ou
  registro foi criado/alterado no Clube.
- Hipótese a confirmar com a Saipos: o valor salvo anteriormente como
  `SAIPOS_TOKEN` é de
  outro produto/integração, está expirado, ou o token específico da API de
  Consulta de Dados ainda não foi emitido/liberado. Não enviar o token pelo
  atendimento; pedir que validem a emissão e o método de autenticação.

Conferir: a venda pelo número/valor, os campos técnicos recebidos (incluindo
`id_sale`, `canceled`, `updated_at`, `table_order` e `payments`) e o tempo até
ela aparecer após o pagamento. Repetir depois com uma venda cancelada/estornada
quando houver um caso de teste apropriado. Só então definiremos a regra V2.

### Segunda tentativa — 17/09/2026, Mesa 99 antes do pagamento

- Com `SAIPOS_DATA_API_TOKEN` salvo como Secret em Production, a mesma consulta
  passou de **401** para **400**. Isso demonstra que a chave agora é enviada e
  aceita para autenticação; a falha é de formato da consulta, não de credencial.
- Revisando a documentação oficial, identificamos que `p_store` não é um filtro
  aceito por `GET /v1/search_sales`. O conector foi corrigido para enviar apenas
  os parâmetros documentados de período e paginação.
- A próxima tentativa continua sendo estritamente de leitura: nenhum cliente,
  ponto, QR, cupom ou registro interno é criado/alterado.

### Conexão confirmada — 17/09/2026

- Depois da correção, o diagnóstico recebeu uma amostra de **50 vendas** do dia
  por `GET /v1/search_sales`. A API devolveu, entre outros, identificador de
  venda, valor, indicador de cancelamento e a estrutura de formas de pagamento.
- A busca específica pela Mesa 99 retornou zero resultados nessa etapa. Isso
  **não** autoriza qualquer benefício e não caracteriza divergência: a mesa
  pode ainda estar aberta, a venda pode só aparecer depois do fechamento, ou o
  número impresso da mesa pode não ser o identificador retornado em
  `table_order`.
- Próximo teste controlado: após o pagamento, consultar a mesma data e comparar
  a venda real pelo horário, valor e campos `table_order`/`payments`. Registrar
  qual identificador da API corresponde à mesa visível e qual campo prova que a
  cobrança foi concluída. Até então, a roleta segue bloqueada para vendas reais.

### Pagamento de teste informado — 17/09/2026, Mesa 99

- O responsável informou pagamento por volta de **15:58**, na modalidade
  “pagamento não cadastrado”, com total aproximado de **R$ 286**.
- A busca somente-leitura por valor (tolerância de R$ 5) não encontrou venda
  correspondente no recorte `shift_date`. O diagnóstico foi ampliado para
  consultar também por `updated_at`, o campo adequado para uma baixa de
  pagamento; o resultado também foi zero no momento do teste.
- Isto **não prova que a mesa não foi paga**, nem autoriza concluir que houve
  erro da Saipos. Pode haver atraso de disponibilidade, valor fora da
  tolerância, campo/horário de filtro diferente ou referência operacional não
  exposta pela resposta. O Clube não criou QR, ponto, cupom, cliente ou prêmio.
- Próxima evidência necessária: identificar, numa venda de teste, o `id_sale`
  e os valores/status exatos que a Saipos retorna depois da baixa. Até isso
  ocorrer, QR fica bloqueado.

### Chave confirmada pela comanda impressa — Mesa 99

A foto da comanda fechada revelou que o valor exato era **R$ 274,45** (não o
valor aproximado informado inicialmente) e que ela imprime o **ID do Pedido
872482756**. Nova consulta de leitura por `updated_at` e R$ 274,45 retornou
uma venda não cancelada com o mesmo `id_sale` 872482756 e a forma “Pagamento
não cadastrado” no mesmo total. A API também retornou atualização às 16:45.

Isso prova que `id_sale` é uma chave de reconciliação promissora, mas **não
mede a latência**: a primeira consulta usou R$286 e não conseguimos afirmar
quando a venda apareceu. O próximo teste deve registrar a hora exata do
fechamento e consultar imediatamente o ID impresso, repetindo em intervalos
curtos até encontrá-lo. Nenhum QR, ponto, cupom ou prêmio foi criado neste
diagnóstico.

### Medição de disponibilidade — Mesa 199

Em 17/09/2026, uma mesa de teste foi aberta às 19:56, fechada e paga por volta
das 20:00. A comanda fechada confirmou o total de R$ 138,60 e forneceu o ID
impresso do pedido. A consulta protegida retornou zero vendas antes do
pagamento, imediatamente após o pagamento por mesa/valor e novamente por ID
impresso usando o filtro `updated_at`.

Este resultado é uma medição inicial de indisponibilidade imediata, não uma
falha nem uma conclusão sobre o prazo máximo da Saipos. Não houve criação de
cliente, ponto, QR, cupom ou registro de venda no Clube. O próximo passo é
repetir a mesma consulta pelo ID em intervalos documentados, até a venda
aparecer, e então comparar `id_sale`, total, cancelamento, pagamento e horário
de atualização.
