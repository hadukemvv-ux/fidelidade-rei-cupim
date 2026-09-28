# Diário de entregas

Entrada nova no topo. No máximo 5 linhas: data, quem, o que mudou, PR/commit,
o que ficou pendente. Detalhe técnico vai no PR, não aqui.

---

**28/09/2026 — Claude** · Limpeza do legado, parte 1: removidas rotas mortas (`/api/test-env`, `/api/debug`, `/teste`, pasta `src/pages`), o controle antigo de garçons (telas e rotas que só respondiam "desativado") e imagens sem uso. Banco não foi tocado. 87/87 testes, tipos e build OK. Pendente: roleta V1, sorteio e `/validar` após o piloto.

**28/09/2026 — Claude** · Documentação reorganizada: `AGENTS.md` com divisão de trabalho
e fluxo de branches/PR; novos `COMECE_AQUI`, `ROADMAP` por fases com dono e este diário.
Documentos de tema movidos para `docs/referencia/`, antigos para `docs/historico/`.
Nenhum código alterado.

**28/09/2026 — Codex** · Landing: mensagem única de benefícios (pontos para produtos +
cashback para descontos) e tabela de equivalência corrigida, preservando o layout.
Commits `66196b3` e `08197e0`, deploy confirmado.

**28/09/2026 — Codex** · Simulador `/admin/baixas` (dados fictícios em memória) publicado
em `2cb51fe`; contraste dos botões corrigido em `0916cb3`. Bot e migração da inbox
continuam desligados/não aplicados.
