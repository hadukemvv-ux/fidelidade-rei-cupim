# Regras atuais do programa de fidelidade

Atualizado em 16/09/2026. Este é um registro interno de regras em pré-lançamento;
não substitui os termos públicos nem autoriza a abertura do programa.

## Níveis e benefícios

O benefício aplicado à compra é o do nível que o cliente possuía antes dessa compra.

| Nível de fidelidade | Gasto elegível em 90 dias | Pontos por R$ 1 | Cashback |
| --- | ---: | ---: | ---: |
| Brasa (Bronze) | R$ 0 a R$ 99,99 | 1 | 0% |
| Chama (Prata) | R$ 100 a R$ 249,99 | 2 | 0,5% |
| Nobre (Ouro) | R$ 250 a R$ 499,99 | 4 | 1% |
| Majestade (Rei) | A partir de R$ 500 | 7 | 3% |

Tickets e sorteios estão congelados: não são acumulados, não geram entrada e não podem ser divulgados como benefício futuro até decisão jurídica/comercial nova.

## Faixas da Roleta V2 (separadas do nível de fidelidade)

A Roleta V2 fechada usa cinco **faixas da compra que gerou o QR**, somente para ponderar o prêmio daquele giro: Brasa (até R$ 99,99), Chama (R$ 100–249,99), Nobre (R$ 250–399,99), Rei (R$ 400–499,99) e Lenda (R$ 500+). Essas faixas não alteram pontos, cashback ou o nível de fidelidade de 90 dias. A V2 continua em modo de teste e não deve ser anunciada ao público.

## Cadastro e acesso

- Novo cadastro verificado com data de nascimento recebe 200 pontos de bônus.
- O cliente acessa o saldo com telefone e PIN de quatro dígitos.
- Depois do PIN correto, a sessão fica protegida em cookie HttpOnly por oito horas.
- Alteração de cadastro, consulta protegida e resgate exigem sessão vinculada ao mesmo telefone.
- Cadastro novo, pré-cadastro e recuperação de PIN exigem um código enviado por WhatsApp.
- O WhatsApp não é exigido no login cotidiano: depois do cadastro, o cliente usa telefone e PIN.
- No beta, somente telefones convidados podem pedir códigos. Cada telefone pode receber até três códigos por hora, cada IP até dez por hora e o projeto inteiro até trinta por dia.
- A autorização gerada pelo OTP dura dez minutos, fica em cookie HttpOnly, serve apenas para o telefone/finalidade confirmados e só pode ser usada uma vez.
- PINs novos usam derivação forte com salt; hashes antigos são migrados automaticamente após um login válido.
- Dez tentativas incorretas bloqueiam temporariamente novas tentativas da conta por 15 minutos.
- A integração WhatsApp OTP está implementada, mas permanece desativada até configurar um provedor oficial, remetente, templates e custos. Logo, o cadastro público não está pronto para abertura; não anunciar o programa como disponível enquanto esse requisito não estiver resolvido e testado.

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
- Pontos, cashback, nível e histórico são gravados atomicamente. Tickets permanecem congelados e com valor zero.
- A importação manual de vendas está temporariamente desativada porque o formato antigo não fornecia idempotência confiável.
- A importação manual de clientes permanece disponível e não altera saldos existentes.

## Regras em transição

- A intenção do programa é classificar o nível por uma janela móvel de 90 dias.
- Para clientes antigos ainda sem backfill dessa janela, o sistema usa provisoriamente o total histórico já existente como base e passa a manter o novo campo nas compras seguintes.
- A expiração automática de pontos está desativada. Nenhum saldo é reduzido até existir um ledger por lote e uma política comercial aprovada.

## Valor econômico de referência

Para relatórios administrativos, 100 pontos representam R$ 1 em produtos. Isso não transforma os pontos em dinheiro sacável.
