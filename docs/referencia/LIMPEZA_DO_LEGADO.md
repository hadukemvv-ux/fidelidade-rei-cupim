# Limpeza do legado — rumo à Roleta V2

Atualizado em 16/09/2026. O programa ainda não foi lançado ao público. Portanto, não há obrigação de manter compatibilidade com telas, cupons ou fluxos antigos: eles servem apenas como referência para extrair regras úteis e serão removidos depois de substituídos.

## Regra de decisão

Uma parte antiga só permanece enquanto for necessária para:

1. entender uma regra que será transportada para a V2; ou
2. manter alguma dependência técnica que ainda não foi substituída.

Não manteremos dois caminhos ativos para a mesma ação. A V2 será a única fonte de verdade para QR, giro, prêmio e cupom.

## Já desativado

- Roleta V1: `/roleta` informa que a V2 está em preparação e `POST /api/roleta/girar` retorna bloqueio.
- Rota `/api/debug`: desativada; não pode expor registros de resgate.
- Controle antigo de garçons: as rotas de senha, ranking, “alertas”, logs, reset e prêmios em `/api/admin/garcons/*` e `/api/garcons/validar` retornam `410`. As telas antigas não exibem mais senha previsível, telefone ou IP; direcionam para Acessos, Roleta V2, Auditoria e Privacidade.

## Legado ainda presente, mas não operacional

| Item | Por que ainda existe | Destino na V2 |
| --- | --- | --- |
| `/validar` e `/api/validar` | Referência do antigo validador de QR/cupom. | Substituir pelo fluxo autenticado de `/caixa`, depois remover rota e página. |
| `resgates` e `/api/resgate` | Base histórica de pontos/resgates e origem de QR antigo. | Transportar apenas regras comerciais que forem aprovadas; V2 emite em `cupons_promocionais`. |
| `garcons`, `garcons_logs`, `historico_roleta` | Estrutura da primeira roleta, já sem rota ou tela operacional. | Usar `perfis_operacionais`, `roleta_sessoes`, `roleta_giros`, `cupom_eventos` e `administracao_eventos`. Manter isolada até revisar prazo de retenção e exclusão segura. |
| Sorteios e cron de sorteio | Ideia anterior, não parte do lançamento atual. | Manter desligado; decidir se será reconstruído como produto separado ou removido. |

## Ordem segura de remoção

1. Concluir o piloto fechado da V2: QR → telefone → giro de teste → cupom → consulta na caixa → auditoria.
2. Criar a consulta/validação de cupom V2 que cubra todos os prêmios aprovados.
3. Atualizar links de QR, menus e telas para apontarem somente à V2.
4. Procurar referências no código, crons, relatórios e banco antes de cada remoção.
5. Rotas e páginas antigas já foram pausadas; após o piloto V2, retirar tabelas, RPCs e colunas sem dependências, respeitando a retenção aprovada e registrando a limpeza.
6. Registrar no roadmap a lista exata do que foi removido e manter a migração de banco no Git.

## Não fazer

- Não apagar tabelas ou dados por impulso, mesmo sendo dados de teste.
- Não ativar a V2 nem apagar a V1 antes do piloto V2 completo.
- Não reaproveitar o validador antigo para prêmio V2: ele não tem a atomicidade e auditoria necessárias.
