# Diário de entregas

Entrada nova no topo. No máximo 5 linhas: data, quem, o que mudou, PR/commit,
o que ficou pendente. Detalhe técnico vai no PR, não aqui.

---

**29/09/2026 — Claude** · Roleta interativa: arrastar com o dedo, botão PARAR, parada automática em 4 s, desaceleração lenta com pinos e som, confete nas cores da marca e revelação com foto. Resultado continua 100% do servidor (a animação só decide o caminho). Demonstração sem registro em `/roleta/demo`. Física com 900 combinações testadas; fluxo testado no navegador. Faltam fotos reais e celulares reais.

**29/09/2026 — Claude** · Revisão de `codex/baixas-reais` (bf1d409): 99 testes, tipos e lint OK; permissões e ordem de locks revisadas (revisão de código, sem teste real de concorrência). Bloqueante: gatilho aborta o giro depois do sorteio em QR manual sem comanda, permitindo girar de novo. Recado enviado ao Codex.

**29/09/2026 — Claude** · Backup diário do Supabase no GitHub Actions: banco + arquivos (sem fotos de comanda), criptografado, 30 dias, com teste de restauração automático. Guia com opções e custos em `docs/referencia/BACKUP_E_MIGRACAO.md`. Aguarda 3 segredos no GitHub para a 1ª execução.

**29/09/2026 — Claude** · Ícones do site trocados pelo foguinho oficial: favicon (16/32/48), ícone 256 e ícone de tela inicial do iPhone (fundo escuro). Recorte em `public/brand/logo-foguinho.png`. Arte original tem ~125 px: pedir versão vetorial.

**28/09/2026 — Claude** · Lint zerado (era 23 erros e 16 avisos): `any` trocado por tipos reais, variáveis sem uso removidas, texto alternativo em imagem e exceções justificadas em comentário onde o padrão atual está correto. Sem mudança de regra ou dado. Lint, tipos, 87/87 testes e build OK.

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
