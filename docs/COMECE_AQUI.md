# Comece aqui — ponto único de retomada

Atualizado em 21/09/2026. Leia este arquivo antes de alterar, testar ou publicar
qualquer parte do Clube. Ele é o índice vigente quando houver troca de computador
ou de pessoa responsável pelo projeto.

## Estado confirmado

- Repositório: `hadukemvv-ux/fidelidade-rei-cupim`, branch `main`.
- Último checkpoint funcional publicado: `f436a6d` — encaminha cada pessoa após
  o login para a operação correta: garçom `/garcom/comanda`, caixa `/caixa` e
  gestor/superadmin `/admin`. O deploy foi confirmado como `Ready` na Vercel.
  O cron de reconciliação foi publicado em `44e513f`; o fluxo de consulta usa
  `SAIPOS_DATA_API_TOKEN` em Production.
- Produção: `clubecupim.com.br` / projeto Vercel `fidelidade-rei-cupim`.
- Banco correto: Supabase `asjoubgoccbvftyggunz`. Não usar o projeto Energia.
- A Roleta V2 está aberta exclusivamente para o piloto técnico
  (`v2_publicada=true`, `v2_modo_teste=true`): QR dura 10 minutos e só há um
  prêmio interno de custo R$ 0,00. Não há campanha, benefício ou cupom
  comercial liberado; a baixa do cupom de teste é recusada pelo banco.
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
3. Definir provedor oficial de WhatsApp, remetente, templates, custos e opt-out;
   então configurar OTP e executar o teste controlado. Não automatizar WhatsApp
   pessoal.
4. Definir a apresentação comercial: fidelidade possui quatro níveis por gasto
   em 90 dias; a Roleta V2 usa cinco faixas da compra somente para chances do
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
