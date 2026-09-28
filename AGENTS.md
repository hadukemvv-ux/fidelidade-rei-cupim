<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Diretrizes do Clube Cupim — comunicação e regras

- Ler `docs/COMECE_AQUI.md`, `docs/ROADMAP.md`, `docs/REGRAS-FIDELIDADE.md`
  e `docs/COMUNICACAO_PUBLICA.md` antes de revisar benefícios ou a landing.
- Preservar a proposta comercial/layout da landing. O responsável esclareceu
  em 28/09 que NÃO quer trocar por “em construção” para depois desfazer.
  Pendências operacionais ficam no roadmap; não reposicionar a marca por conta própria.
- Valores e percentuais vêm de `src/lib/fidelidade-rules.ts`. Não manter tabelas
  duplicadas de taxas na UI nem somar pontos brutos a percentual de cashback.
  Converter pontos a valor de referência antes de apresentar o total.
- Pontos para produtos e cashback para descontos são saldos diferentes.
  “10% em benefícios” no Majestade significa 7% via pontos + 3% cashback,
  não 10% de cashback, dinheiro sacável ou desconto imediato integral.
- A mensagem `MENSAGEM_BENEFICIOS_CLUBE` é estável. Mudanças de texto/regras
  exigem solicitação/revisão do responsável; não criar variantes A/B ou
  alterar semântica como efeito colateral de um redesenho.
- Mudança de comunicação não autoriza ativar crédito, campanha, bot ou
  migration. Distinguir código/publicação de operação comercial no registro.
- Manter consentimento promocional separado/opcional e sem marcação prévia.
- Verificar contas por nível, exemplos, mobile e desktop; registrar decisões,
  evidências e limites no README, roadmap e caderno antes do commit.
