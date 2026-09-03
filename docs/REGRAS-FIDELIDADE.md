# Regras atuais do programa de fidelidade

Atualizado em 03/09/2026.

## Níveis e benefícios

O benefício aplicado à compra é o do nível que o cliente possuía antes dessa compra.

| Nível | Gasto elegível | Pontos por R$ 1 | Cashback | Tickets por R$ 100 |
| --- | ---: | ---: | ---: | ---: |
| Brasa (Bronze) | R$ 0 a R$ 99,99 | 1 | 0% | 1 |
| Chama (Prata) | R$ 100 a R$ 249,99 | 2 | 0,5% | 2 |
| Nobre (Ouro) | R$ 250 a R$ 499,99 | 4 | 1% | 5 |
| Majestade (Rei) | A partir de R$ 500 | 7 | 3% | 10 |

Frações de ticket são transportadas para a compra seguinte. Portanto, uma compra pequena não perde a parte fracionária já acumulada.

## Cadastro e acesso

- Novo cadastro verificado com data de nascimento recebe 200 pontos de bônus.
- O cliente acessa o saldo com telefone e PIN de quatro dígitos.
- Depois do PIN correto, a sessão fica protegida em cookie HttpOnly por oito horas.
- Alteração de cadastro, consulta protegida e resgate exigem sessão vinculada ao mesmo telefone.
- Cadastro novo, pré-cadastro e recuperação de PIN exigem confirmação da posse do telefone. Enquanto a automação segura não estiver pronta, o site encaminha para o atendimento pelo WhatsApp.
- PINs novos usam derivação forte com salt; hashes antigos são migrados automaticamente após um login válido.
- Dez tentativas incorretas bloqueiam temporariamente novas tentativas da conta por 15 minutos.
- Nenhum SMS ou serviço pago está ativado.

## Resgates

- Limite geral: um resgate por cliente em cada dia civil de Fortaleza.
- Entrega grátis: 200 pontos.
- Cashback: cupons de R$ 5, R$ 10 ou R$ 15, conforme saldo disponível.
- Produtos: custo definido no catálogo administrativo.
- Produto marcado como destaque: 50% do custo normal em pontos.
- Saldo, limite diário, criação do cupom e auditoria são confirmados em uma única transação no banco.

## Vendas e segurança de saldo

- A venda elegível usa o valor total recebido da Saipos.
- Cada `id_sale` pode ser creditado apenas uma vez.
- Venda cancelada, sem valor ou sem identificação do cliente não gera benefício.
- Pontos, cashback, tickets, nível e histórico são gravados atomicamente.
- A importação manual de vendas está temporariamente desativada porque o formato antigo não fornecia idempotência confiável.
- A importação manual de clientes permanece disponível e não altera saldos existentes.

## Regras em transição

- A intenção do programa é classificar o nível por uma janela móvel de 90 dias.
- Para clientes antigos ainda sem backfill dessa janela, o sistema usa provisoriamente o total histórico já existente como base e passa a manter o novo campo nas compras seguintes.
- A expiração automática de pontos está desativada. Nenhum saldo é reduzido até existir um ledger por lote e uma política comercial aprovada.

## Valor econômico de referência

Para relatórios administrativos, 100 pontos representam R$ 1 em produtos. Isso não transforma os pontos em dinheiro sacável.
