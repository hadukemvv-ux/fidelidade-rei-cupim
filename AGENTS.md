<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Clube Cupim — regras para os agentes (Codex e Claude)

Este arquivo vale para os dois agentes (o `CLAUDE.md` importa este arquivo).
É curto de propósito: **não escreva checkpoints, históricos ou estados aqui.**

## 1. Antes de qualquer tarefa

1. Ler `docs/COMECE_AQUI.md` (estado atual em uma página).
2. Ler `docs/ROADMAP.md` e achar a tarefa: ela deve ter **dono** e **fase**.
3. Ler as últimas entradas de `docs/DIARIO.md`.
4. Consultar `docs/referencia/` só quando o assunto exigir.
5. `docs/historico/` é arquivo morto: não seguir como instrução e não editar.

## 2. Quem faz o quê

Regra simples: **mudou regra, número, dinheiro ou dado → Codex. Mudou o que a
pessoa vê na tela, organização ou limpeza → Claude.**

| Dono | Frentes |
| --- | --- |
| **Codex — o motor** | Regras de pontos, cashback, níveis e prêmios (`src/lib/*-rules.ts`); banco de dados e migrações; Saipos; WhatsApp (OTP e bot); baixas reais de prêmios; crons |
| **Claude — a vitrine e a casa** | Visual das telas (landing, roleta no celular, painéis), logo e ícones; documentação; limpeza do legado; lint; backup do Supabase; revisão das entregas do Codex que mexem em banco ou dinheiro |
| **Responsável — o dono do negócio** | Decide e autoriza: jurídico, prêmios e custos, WhatsApp, planos pagos, arte oficial, pilotos no restaurante. Não mexe em GitHub |

### Exemplos de pedidos e de quem é

| Pedido do responsável | Dono |
| --- | --- |
| "Muda quantos pontos o cliente ganha" / "cria um nível novo" | Codex |
| "Troca os prêmios da roleta" / "muda as chances" | Codex |
| "O cliente não recebeu os pontos" / "a Saipos não bateu" | Codex |
| "Liga o WhatsApp" / "manda mensagem pro cliente" | Codex |
| "Registrar a saideira entregue" / "baixa do estoque" | Codex |
| "Deu erro no painel ao salvar" (erro de dado/servidor) | Codex |
| "A roleta tá feia no celular" / "muda a cor, a foto, o layout" | Claude |
| "Coloca a logo nova" / "troca o ícone do site" | Claude |
| "Muda um texto do site" (sem mudar regra ou valor) | Claude |
| "Organiza os documentos" / "o que falta fazer?" | Claude (o Codex também pode responder lendo o ROADMAP) |
| "Faz backup do banco" / "limpa código velho" | Claude |
| "Confere se o que o Codex fez tá certo" | Claude |
| "Contrata plano" / "aprova prêmio" / "fala com advogado" | Responsável (agente só explica as opções) |

Pelas pastas, em caso de dúvida:

- **Codex:** `supabase/`, `src/lib/` (regras, Saipos, WhatsApp, cupons, sessões),
  `src/app/api/`, `vercel.json`, `tests/` das regras.
- **Claude:** estilos e layout das páginas em `src/app/**/page.tsx` e `*.module.css`,
  `src/app/globals.css`, `src/components/`, `public/`, `docs/`, `scripts/backup-*`.
- Página que mistura as duas coisas: Claude muda o visual, Codex muda a lógica.

### Se o pedido chegou para a IA errada

1. **Não comece a fazer.** Diga, em linguagem simples:
   "Isso é tarefa do **Codex/Claude** pelo nosso combinado. Cole isto lá:"
2. Entregue o recado pronto para colar, em um bloco, com o pedido reescrito
   de forma clara e o contexto necessário (arquivos, erro, o que já se sabe).
3. Se o responsável insistir ("faz você mesmo"), pode fazer. Registre no
   `docs/DIARIO.md` "feito por X no lugar de Y, a pedido do responsável" para o outro saber.
4. Pedido misto (regra + visual): faça só a sua parte e entregue o recado da outra.
5. Tarefa que não se encaixa na tabela ou decisão de negócio: pergunte ao
   responsável quem deve fazer. Não decida sozinho.

- Só o responsável muda esta divisão.

## 3. Git — cada agente na sua pasta e branch

O responsável **não usa GitHub**. Os agentes cuidam de tudo e só pedem
"posso publicar?" em linguagem simples.

- Codex: pasta `fidelidade-rei-cupim`. Claude: pasta `fidelidade-rei-cupim-claude` (git worktree).
- Nunca commitar direto em `main`. Uma branch por tarefa: `codex/<tema>` ou `claude/<tema>`.
- Antes de começar: `git fetch` e criar a branch a partir de `origin/main` atualizado.
- Ao terminar: testes (`npm run test:unit`, `npx tsc --noEmit`) e push da branch.
- Entrega do Codex que mexe em banco, migração, Saipos ou saldo: pedir revisão
  do Claude antes de publicar (o responsável repassa o pedido).
- **Publicar** = o próprio agente atualiza a branch com `origin/main`, resolve
  conflitos, faz merge em `main` e push. Só depois do responsável dizer
  "pode publicar". Push em `main` = deploy em produção na Vercel.
- Depois de publicar, conferir o site em produção e contar ao responsável o que mudou, em uma frase.
- A Vercel gera Preview por branch, mas sem os segredos de produção: não usar
  para fluxos com sessão, Saipos ou dados reais.

## 4. Documentação — regra enxuta

Ao terminar uma tarefa, atualize **somente**:

1. `docs/ROADMAP.md`: marcar/ajustar a linha da tarefa (uma linha, sem parágrafos).
2. `docs/DIARIO.md`: uma entrada no topo, no máximo 5 linhas.

- Detalhes técnicos vão na descrição do PR e no commit, não em documentos.
- `docs/COMECE_AQUI.md` só muda quando o estado geral muda (ex.: algo foi lançado).
- `docs/referencia/` só muda quando uma regra ou decisão muda.
- Não criar documento novo sem pedido do responsável.
- Não mexer no README além do necessário para rodar o projeto.

## 5. Decisões do responsável que continuam valendo

- **Landing:** preservar a proposta comercial, layout, fotos e chamadas. Não trocar
  por "em construção" nem reposicionar a marca por conta própria (decisão de 28/09).
- **Benefícios:** valores vêm de `src/lib/fidelidade-rules.ts`. A mensagem
  `MENSAGEM_BENEFICIOS_CLUBE` é estável, sem variantes A/B. Pontos (produtos) e
  cashback (descontos) são saldos diferentes; nunca somar pontos brutos com
  percentual. Detalhes em `docs/referencia/COMUNICACAO_PUBLICA.md`.
- **Operação comercial:** publicar código não autoriza ligar pontos, campanha,
  bot, OTP, prêmio comercial ou aplicar migração. Isso exige ordem explícita do responsável.
- **WhatsApp:** nunca conectar o WhatsApp pessoal; aguardar número separado.
- **Marketing:** consentimento promocional separado, opcional e sem marcação prévia.
- **Dados:** não apagar tabelas, buckets ou dados antigos. Não versionar
  `.env.local`, tokens, senhas, PIN, QR, telefones ou dados de clientes.
- **Supabase correto:** `asjoubgoccbvftyggunz`. Nunca usar o projeto "Energia".
