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

- Só trabalhe em tarefa cujo dono é você. Se precisar mexer na frente do outro,
  **não mexa**: registre no `docs/DIARIO.md` ("precisa do Codex/Claude: ...") e avise o responsável.
- Tarefa sem dono ou decisão de negócio: pergunte ao responsável em linguagem simples, não decida.
- Só o responsável muda esta tabela.

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
