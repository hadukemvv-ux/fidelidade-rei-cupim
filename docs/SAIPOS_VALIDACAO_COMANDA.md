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
