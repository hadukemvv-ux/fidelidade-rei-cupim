# Comece aqui — ponto único de retomada

Atualizado em 28/09/2026. Leia este arquivo antes de alterar, testar ou publicar
qualquer parte do Clube. Ele é o índice vigente quando houver troca de computador
ou de pessoa responsável pelo projeto.

## Checkpoint vigente — 28/09/2026

- Esclarecimento da landing: manter proposta comercial e layout, sem “em
  construção” temporário. Explicar pontos para produtos + cashback para
  descontos com fonte única; totais de referência não são todo cashback.
  Ler `docs/COMUNICACAO_PUBLICA.md` antes de alterar redação ou taxas.
  Revisão local validada: 87/87 testes, tipos, lint, build e painel desktop/
  móvel. Publicada por `66196b3`, deploy `9qQoyeSx3oDMcnMuov2yuJfP2SC8`
  confirmado Ready; mensagem e exemplo conferidos em produção. Isso não
  resolve os bloqueadores operacionais.

- Base anterior desta etapa: commit `524ad68` em `main`; diagnóstico funcional
  `65eb9a4` teve deploy confirmado Ready. Não presumir que commits novos já
  estejam publicados: verificar GitHub e Vercel separadamente.
- Código desta etapa: `/admin/baixas` é SOMENTE um simulador em memória com
  dados fictícios, sem estoque, clientes, cupons ou mensagens reais. Permite
  seleção → entrega → baixa manual simulada e fechamento diário UTC−3.
- WhatsApp pessoal não será conectado; aguardar número separado e aprovação
  do canal. Bot e OTP desligados. Base Cloud API é experimental, não decisão
  de contratação. Migração `202609280001_whatsapp_bot_inbox.sql` não aplicada.
- Ver `docs/WHATSAPP_BOT_E_BAIXAS.md` para limites, testes e próxima sequência.
  Não aplicar migrações nem habilitar envio somente por estarem versionados.
- 84/84 testes, tipos, lint dos arquivos alterados e build local aprovados em
  28/09. Ensaio manual/visual do simulador e deploy desta etapa não confirmados.
- Pontuação diária Saipos continua pausada; salão vincula telefone no Clube,
  não na Saipos. Conta legada com PIN próprio sem telefone comprovado ainda
  precisa de fluxo seguro de verificação. Critérios completos no roadmap.

### Evidência posterior de publicação — 28/09

`2cb51fe` enviado ao GitHub e confirmado Ready em produção na Vercel
(`AaLbabwUMTSFsMK6rRvrdMNksJGN`). `/admin/baixas` aberta e ensaio fictício
de expulsadeira/baixa/alerta de 73h confirmado. Foi detectado contraste ruim
nos botões por CSS legado e preparada correção isolada em CSS Module nesta
entrega. Testes no celular e revisão do responsável continuam pendentes.
Este registro substitui a condição de deploy não confirmado acima; não muda
a decisão de manter bot desligado e migração não aplicada.

## Estado confirmado anteriormente — histórico de 22/09

As referências de versão abaixo são históricas, não o último código da branch.

- Repositório: `hadukemvv-ux/fidelidade-rei-cupim`, branch `main`.
- Último checkpoint funcional publicado: `be86bde` — nova interface da roleta
  V2 e da gestão de prêmios, com prêmio visual alinhado ao resultado do banco.
  O deploy foi confirmado como `Ready` na Vercel. As rotas pós-login seguem
  separadas: garçom `/garcom/comanda`, caixa `/caixa` e gestor `/admin`.
  A reconciliação consulta a Saipos com `SAIPOS_DATA_API_TOKEN` em Production.
- Produção: `clubecupim.com.br` / projeto Vercel `fidelidade-rei-cupim`.
- Banco correto: Supabase `asjoubgoccbvftyggunz`. Não usar o projeto Energia.
- A Roleta V2 está aberta exclusivamente para o piloto técnico
  (`v2_publicada=true`, `v2_modo_teste=true`): QR dura 10 minutos e só há um
  prêmio interno de custo R$ 0,00. Não há campanha, benefício ou cupom
  comercial liberado; a baixa do cupom de teste é recusada pelo banco.
- A nova interface da roleta usa apenas os prêmios elegíveis para a faixa e
  revela o resultado sorteado pelo servidor. Em `/admin/roleta`, o prêmio
  interno aparece separado do catálogo comercial, que permanece em rascunho.
  A referência visual é o Instagram público `@oreidocupim_` (preto, vermelho,
  dourado e linguagem de churrasco). A aprovação final da arte e dos prêmios
  comerciais ainda depende do responsável.
- A migração de hardening `202609160001_hardening_critico_legado.sql` já foi
  aplicada e verificada no Supabase. O bucket `sorteios` está privado e as RPCs
  sensíveis são exclusivas do servidor.
- `CUSTOMER_SESSION_SECRET` existe como Secret em Production na Vercel. Preview
  deve receber segredo diferente antes de usar fluxos de sessão nesse ambiente.

## Fonte de verdade por assunto

| Assunto | Documento vigente |
| --- | --- |
| Estado, prioridades e critério de abertura | `docs/ROADMAP.md` |
| Riscos técnicos, medidas aplicadas e pendências | `docs/AUDITORIA_TECNICA_2026-09-16.md` |
| Privacidade, contenção e resposta a incidente | `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md` |
| Checklist de testes antes de cliente real | `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md` |
| Regras de pontos, cashback e Roleta V2 | `docs/REGRAS-FIDELIDADE.md` |
| Saipos: contrato pendente e prova de conceito segura do token | `docs/SAIPOS_VALIDACAO_COMANDA.md` |
| Estratégia para retirar legado | `docs/LIMPEZA_DO_LEGADO.md` |
| Retomada em computador novo | `docs/RETOMADA_EM_NOVO_COMPUTADOR.md` |
| Matriz de papéis e rotas | `docs/PERMISSOES_OPERACIONAIS.md` |
| Mensagem estável e equivalência pontos + cashback da landing | `docs/COMUNICACAO_PUBLICA.md` |
| Bot operacional, entrega de prêmios e simulador de baixas | `docs/WHATSAPP_BOT_E_BAIXAS.md` |

## Próxima sequência segura

1. Quando o responsável autorizar, executar o teste controlado no fluxo real: entrar como garçom em
   `/garcom/comanda`, enviar duas fotos, confirmar somente o valor e gerar QR
   de teste. Repetir para uma venda concluída, uma cancelada e uma mesa fechada
   sem venda. Guardar o **ID do Pedido impresso**, valor e horário aproximado;
   consultar `/admin/saipos` por `updated_at` até a manhã seguinte e acompanhar
   `/admin/operacao-roleta`. A Saipos é por consulta (pull), sem webhook
   indicado. Foto nunca libera benefício comercial automaticamente.
2. Antes de convidar equipe, conferir no Supabase a Redirect URL
   `https://www.clubecupim.com.br/acesso/definir-senha`. O convite abre essa
   página para criar a senha; o superadmin pode reenviar um acesso pelo painel
   sem conhecer a senha da pessoa.
3. Enquanto aguardamos número separado, revisar `/admin/baixas` pelo caderno
   de testes. Canal do bot operacional continua em aberto; OTP mantém a rota
   oficial preparada. Aprovar canal, remetente, templates, custos e opt-out
   antes de configurar/enviarem mensagens. Não automatizar WhatsApp pessoal.
4. Definir a apresentação comercial: fidelidade possui quatro níveis por gasto
   em 90 dias; a Roleta V2 usa seis faixas da compra somente para chances do
   giro. A interface já esclarece a diferença, mas ela deve ser aprovada antes
   do piloto.
5. Executar os testes do roteiro mestre, com conta/telefone de teste e sem
   benefício comercial real.
6. Só após Saipos, segurança, jurídico, prêmios/custos, equipe e piloto estarem
   aprovados, considerar publicar a V2.

## Limites importantes

- Não lançar a Roleta V2 nem o cadastro público: OTP e fluxo de venda paga ainda
  não estão prontos para operação.
- Não apagar tabelas, bucket ou dados antigos; seguir o plano de retenção e
  limpeza.
- Não versionar `.env.local`, token da Saipos, senha, PIN, QR, telefone ou dados
  de clientes.
- Há um rascunho local não versionado em
  `supabase/migrations/202609120001_comandas_roleta_v2.sql`. Ele não foi
  revisado, aplicado ou publicado; manter fora de commits até uma tarefa
  dedicada de Saipos/comanda. Em um clone novo ele não existirá, pois não foi
  enviado ao GitHub.

## Documentos históricos

Arquivos antigos podem explicar decisões passadas, mas não definem o estado atual:
`ARQUITETURA.md`, `DEPLOYMENT.md`, `IMPLEMENTACOES.md`, `STATUS_ALPHA.md`,
`docs/RECUPERACAO_2026-09-10.md`, `docs/AUDITORIA_E_CONTINUIDADE_2026-09-10.md`,
`docs/GUIA-INICIANTE.md` e `docs/GUIA-OPERACAO-E-TESTES.md`.

Quando houver divergência, este arquivo, o Roadmap e a auditoria técnica mais
recente vencem.
