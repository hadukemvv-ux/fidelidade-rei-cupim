# Roadmap — Clube Cupim

Atualizado em 28/09/2026. Uma linha por tarefa. Detalhes vão no PR e no `DIARIO.md`.
Investigações e decisões anteriores (Saipos, telefones, entregas, custos) estão em
`docs/historico/ROADMAP_ATE_2026-09-28.md`.

Legenda: `[ ]` a fazer · `[~]` em andamento · `[x]` feito · **Dono**: Codex, Claude ou Você (responsável).

## Fase 0 — Arrumar a casa (agora)

| | Tarefa | Dono |
| --- | --- | --- |
| [x] | Reorganizar documentação e regras dos agentes | Claude |
| [~] | Remover legado sem uso — rotas mortas e garçons antigos feitos; roleta V1, sorteio e `/validar` só após o piloto (ver `referencia/LIMPEZA_DO_LEGADO.md`) | Claude |
| [x] | Zerar erros do lint global | Claude |
| [ ] | Instalar `gh` e Node no PATH nesta máquina para PRs e testes | Claude |

## Fase 1 — Clube no salão (roleta com prêmio físico na hora)

Meta: primeiro uso real. Prêmio imediato não exige cadastro completo, então **não depende do WhatsApp**.

| | Tarefa | Dono |
| --- | --- | --- |
| [ ] | Parecer jurídico sobre a roleta (promoção com sorte) | Você |
| [ ] | Aprovar prêmios, custos, pesos por faixa e validade | Você |
| [ ] | Contratar hospedagem com uso comercial (Vercel Pro ou alternativa) | Você |
| [~] | Backup diário com teste de restauração pronto (`referencia/BACKUP_E_MIGRACAO.md`); falta você cadastrar 3 segredos no GitHub e rodar o 1º teste | Claude prepara, Você aprova custo |
| [ ] | Baixas reais: gravar escolha → entrega → baixa no banco, com operador e QR reais | Codex |
| [~] | Roleta interativa (arrastar com o dedo, PARAR, parada lenta, confete) pronta; ensaio em `/roleta/demo`; faltam fotos reais dos prêmios e teste em celulares reais | Claude |
| [ ] | Enviar `imagem_url` de cada prêmio na sessão da roleta (`/api/roleta-v2/sessao`) para trocar foto sem mexer em código | Codex |
| [x] | Arte oficial (logo) e ícones do site/favicon — foguinho aplicado; pedir versão vetorial (SVG/PDF) para uso grande | Você envia a arte, Claude aplica |
| [ ] | Piloto Saipos de 3 cenários: venda concluída, cancelada, mesa sem venda | Você executa, Codex analisa |
| [ ] | Testar os 4 acessos reais (garçom, caixa, gestor, superadmin) em produção | Você executa, Claude acompanha |
| [ ] | Roteiro `referencia/TESTES_PENDENTES_PRE_LANCAMENTO.md` — itens da Fase 1 | Todos |
| [ ] | Ligar prêmios comerciais e sair do modo teste | Você autoriza, Codex executa |

## Fase 2 — Pontos e cashback

| | Tarefa | Dono |
| --- | --- | --- |
| [~] | Número separado ativo; responsável escolheu avaliar QR não oficial em teste isolado; operação permanente/custos ainda a decidir | Você |
| [~] | QR WhatsApp: serviço com sessão criptografada e API superadmin prontos/testados; tela `/admin/whatsapp` pronta em `claude/admin-whatsapp`; faltam hospedagem contínua e pareamento persistente real; envio/OTP pendentes | Codex |
| [ ] | Ligar OTP de cadastro e testar | Codex |
| [ ] | Verificação de conta antiga com PIN e sem telefone comprovado | Codex |
| [ ] | Nova rotina de pontuação Saipos: só contas verificadas, idempotente, com relatório | Codex |
| [ ] | Nível por janela móvel real de 90 dias (subir e descer) | Codex |
| [ ] | Decidir regra da primeira compra antes do cadastro (proposta: 7 dias) | Você |
| [ ] | Revisão jurídica da política de privacidade e teste de opt-out | Você |

## Fase 3 — Delivery

| | Tarefa | Dono |
| --- | --- | --- |
| [ ] | Origem confiável do pedido (próprio × iFood/99) — depende da Saipos | Você pergunta à Saipos, Codex integra |
| [ ] | Pontos no delivery e compensação por atraso | Codex |

## Critério para abrir ao público (Fase 1)

- Parecer jurídico favorável e prêmios/custos aprovados.
- Hospedagem comercial contratada e backup do Supabase testado.
- Fluxo QR → giro → prêmio → entrega/baixa → auditoria testado de ponta a ponta.
- Acessos individuais de equipe configurados e testados.
- Botão de contenção testado.
