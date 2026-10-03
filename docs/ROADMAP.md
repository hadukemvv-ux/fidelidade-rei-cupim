# Roadmap — Clube Cupim

Atualizado em 03/10/2026. Uma linha por tarefa. Detalhes vão no PR e no `DIARIO.md`.
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
| [~] | Compatibilidade com o schema real: 25 funções inspecionadas por catálogo em 01/10; correção dos prêmios aprovada; `usar_resgate_legado` usa `resgates.concluido_em` inexistente; ampliar fixtures e corrigir antes de testar a baixa legada | Codex |

## Fase 1 — Clube no salão (roleta com prêmio físico na hora)

Meta: primeiro uso real. Prêmio imediato não exige cadastro completo, então **não depende do WhatsApp**.

| | Tarefa | Dono |
| --- | --- | --- |
| [~] | Parecer jurídico sobre a roleta (promoção com sorte): em 02/10 o responsável decidiu seguir sem parecer, ciente do risco; agentes não travam por isso, mas ligar o comercial continua exigindo ordem explícita dele | Você |
| [ ] | Aprovar prêmios, custos, pesos por faixa e validade | Você |
| [ ] | Contratar hospedagem com uso comercial (Vercel Pro ou alternativa) | Você |
| [x] | Backup Supabase diário (GitHub Actions, 06:00): retomado pelo responsável em 02/10 com endereço do Session pooler; 1ª execução manual verde com restauração conferida tabela a tabela | Claude |
| [~] | Baixas reais: SQL `202609290001` aplicado em 01/10 com autorização; gates de entregas/comercial desligados; faltam concorrência real, catálogo/opções e painel | Codex |
| [~] | Roleta interativa "Brasa Premium" com fotos de cerveja, sobremesa e entrega grátis; faltam fotos próprias de dindim e teste em celulares reais | Claude |
| [~] | Prêmios no painel: correção `202610020001` aplicada/publicada pelo Claude em 01/10, revisada pelo Codex contra catálogo real e permissões; testes ampliados para a função nova e ambos os formatos de tabela; falta refazer o teste de salvar no painel | Codex API, Claude UI |
| [x] | Telas do cliente (cadastro, login/pontos, PIN) com a identidade da roleta; foto do cupim trinchado na home | Claude |
| [x] | Arte oficial (logo) e ícones do site/favicon — foguinho aplicado; pedir versão vetorial (SVG/PDF) para uso grande | Você envia a arte, Claude aplica |
| [ ] | Piloto Saipos de 3 cenários: venda concluída, cancelada, mesa sem venda | Você executa, Codex analisa |
| [ ] | Testar os 4 acessos reais (garçom, caixa, gestor, superadmin) em produção | Você executa, Claude acompanha |
| [ ] | Roteiro `referencia/TESTES_PENDENTES_PRE_LANCAMENTO.md` — itens da Fase 1 | Todos |
| [ ] | Ligar prêmios comerciais e sair do modo teste | Você autoriza, Codex executa |
| [ ] | Controle comercial pelo painel: API/RPC superadmin auditada para ativar prêmio e mudar teste/publicação, confirmação explícita, contenção e gate de ambiente fechado; contrato/testes com schema real antes da tela/revisão; construir sem ligar | Codex backend, Claude UI |

## Fase 2 — Pontos e cashback

| | Tarefa | Dono |
| --- | --- | --- |
| [~] | Número separado ativo; responsável escolheu avaliar QR não oficial em teste isolado; operação permanente/custos ainda a decidir | Você |
| [~] | QR WhatsApp: controle publicado em 26a5743; pareamento e reinício/reconexão reais validados em 30/09; faltam auditoria das transições e acesso administrativo entre redes | Codex |
| [~] | Mensagens QR: mensagem fixa recebida em 30/09, envio manual fechado e dois registros preservados; OTP implantado em 01/10 somente para dois participantes autorizados; fila/gatilhos/campanhas desligados | Codex |
| [~] | OTP QR: piloto fechado Oracle/Vercel para dois participantes; código/verificação comprovados, reset de PIN confirmado pelo responsável; concorrência nativa do cadastro aprovada; falta reteste do cadastro após esta correção, sem ampliar envios | Codex |
| [~] | Cadastro: revisão Claude aprovada, main atual integrada; SQL `202610020002` aplicado/conferido em 03/10 com autorização, RPC só do servidor e nomes repetidos permitidos; 198 testes/tipos/lint e 5 cenários nativos OK; publicação autorizada desta entrega, falta reteste real do piloto | Codex |
| [ ] | Modelos WhatsApp editáveis com variáveis protegidas, fila idempotente e avisos consolidados de pontos/nível; convite por telefone e escolha autenticada de cerveja/sobremesa pelo garçom (sem baixa por mero envio) | Codex; Claude faz telas |
| [~] | Hospedagem WhatsApp: VM gratuita, DNS Registro.br e HTTPS Caddy validados; faltam teste conectado, backup/restauração reais e monitor externo | Codex, Você acessa a conta |
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

- Decisão jurídica registrada pelo responsável (em 02/10 optou por seguir sem parecer, ciente do risco); prêmios/custos e ativação comercial ainda exigem aprovação explícita.
- Hospedagem comercial contratada e backup do Supabase testado.
- Fluxo QR → giro → prêmio → entrega/baixa → auditoria testado de ponta a ponta.
- Acessos individuais de equipe configurados e testados.
- Botão de contenção testado.
