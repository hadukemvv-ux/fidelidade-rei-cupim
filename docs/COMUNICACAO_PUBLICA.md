# Comunicação pública — pontos + cashback (28/09/2026)

## Esclarecimento do responsável

O pedido de mensagem “fixa” significa manter a proposta comercial e explicar
os benefícios reais de forma consistente. Não significa trocar a landing
por “ainda em construção”, esconder os níveis ou refazer a página para depois
reverter. A tentativa local nessa direção foi desfeita antes de commit/push;
nada desse reposicionamento foi publicado.

Preservar título, layout, fotos, vídeo, chamadas de cadastro/acesso e canais
existentes. Ajustar somente a explicação de benefícios e a matemática de
apresentação; taxas e regras operacionais não foram alteradas nesta etapa.

## Mensagem única

**Acumule pontos para trocar por produtos e cashback para usar em descontos.**

Fonte: `MENSAGEM_BENEFICIOS_CLUBE` em `src/lib/fidelidade-rules.ts`; usada na
hero. Não alternar mensagens por tempo, ambiente ou A/B. Mudanças futuras de
semântica/taxas precisam de orientação do responsável e atualização dos testes.

## Equivalência correta

100 pontos representam R$ 1 em produtos como referência econômica do programa.
Isso não transforma pontos em dinheiro sacável nem saldo de cashback.

| Nível | Pontos / R$ 1 | Equivalente em produtos | Cashback | Total de referência |
| --- | ---: | ---: | ---: | ---: |
| Brasa | 1 | 1% | 0% | 1% |
| Chama | 2 | 2% | 0,5% | 2,5% |
| Nobre | 4 | 4% | 1% | 5% |
| Majestade | 7 | 7% | 3% | 10% |

Fórmula: percentual em produtos = pontos por real × 100 / pontos necessários
para R$ 1 em produtos. Total = percentual em produtos + percentual de cashback.
Não somar unidade “pontos” diretamente à unidade “porcentagem”; a equivalência
numérica atual só coincide porque a conversão é 100 pontos por real.

No Majestade, compra elegível de R$ 100 gera 700 pontos (referência R$ 7 em
produtos) e R$ 3 de cashback. No Chama, são 200 pontos (referência R$ 2 em
produtos) e R$ 0,50 de cashback. O total NÃO é todo cashback ou desconto imediato.

Fonte do cálculo da landing: `getResumoBeneficiosNivel`; exemplos usam as mesmas
funções de pontos/cashback das regras existentes, com o nível anterior à compra.
Percentuais são taxas nominais: saldo real obedece ao arredondamento, à
elegibilidade e às regras de resgate/custo do catálogo. Não garantir que todo
produto no catálogo tenha preço em reais rigorosamente proporcional aos pontos.

## Ambiguidades corrigidas / limites

- “Em produtos” passa a “em produtos via pontos”.
- Total passa a “valor equivalente em benefícios”, com explicação dos dois saldos.
- Exemplo por nível mostra pontos e cashback separados, inclusive os R$ 0,50.
- Não alterar percentuais, limites de níveis, crédito, bônus ou catálogo.
- Manter controles do piloto: envio de WhatsApp e pontuação diária continuam
  pausados; publicação de conteúdo não autoriza lançamento comercial.
- Ledger diário, janela móvel real e verificação de telefone continuam no
  roadmap. A correção do texto não afirma que esses bloqueadores foram resolvidos.
- Cadastro/acesso e demais textos da landing foram preservados conforme o
  esclarecimento; ainda precisam de revisão final na abertura efetiva.

Antes de mexer em mensagem/regras, ler este contrato e o roadmap. Evitar trabalho
temporário de “em construção” ou remover blocos inteiros sem pedido explícito.
Validações técnicas/manuais ficam em `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`.
