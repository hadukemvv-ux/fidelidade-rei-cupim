# Diário de entregas

Entrada nova no topo. No máximo 5 linhas: data, quem, o que mudou, PR/commit,
o que ficou pendente. Detalhe técnico vai no PR, não aqui.

---

**29/09/2026 — Codex** · `codex/baixas-reais`: checkpoint da base/API e proposta SQL, gates desligados; 99 testes, tipos e lint dos novos arquivos aprovados.
Faltam execução isolada do SQL (inclusive concorrência/RLS), catálogo/opções por conta, painel e revisão Claude; nada aplicado em produção.
SPA, FAQ 59: benefício objetivo sem aleatoriedade difere de promoção com sorte; pontos sorteados não têm dispensa confirmada.
Fonte: https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial
Nenhuma mudança de mecânica, prêmios ou aprovação jurídica decidida.

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
