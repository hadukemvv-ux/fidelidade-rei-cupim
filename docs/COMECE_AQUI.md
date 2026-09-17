# Comece aqui — ponto único de retomada

Atualizado em 17/09/2026. Leia este arquivo antes de alterar, testar ou publicar
qualquer parte do Clube. Ele é o índice vigente quando houver troca de computador
ou de pessoa responsável pelo projeto.

## Estado confirmado

- Repositório: `hadukemvv-ux/fidelidade-rei-cupim`, branch `main`.
- Último checkpoint funcional publicado: `41a3b97` — separa o segredo da API
  de Dados Saipos e exige `SAIPOS_DATA_API_TOKEN` em Production.
- Produção: `clubecupim.com.br` / projeto Vercel `fidelidade-rei-cupim`.
- Banco correto: Supabase `asjoubgoccbvftyggunz`. Não usar o projeto Energia.
- A Roleta V2 continua fechada (`v2_publicada=false`, modo de teste). Não há
  prêmio, QR ou campanha real liberados por este estado.
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

## Próxima sequência segura

1. Executar a prova de conceito de leitura em `/admin/saipos`; confirmar o
   comportamento de venda paga, cancelada e estornada. A Saipos confirmou API
   por consulta (pull), sem webhook indicado. Foto não libera QR automaticamente.
2. Definir provedor oficial de WhatsApp, remetente, templates, custos e opt-out;
   então configurar OTP e executar o teste controlado. Não automatizar WhatsApp
   pessoal.
3. Definir a apresentação comercial: fidelidade possui quatro níveis por gasto
   em 90 dias; a Roleta V2 usa cinco faixas da compra somente para chances do
   giro. A interface já esclarece a diferença, mas ela deve ser aprovada antes
   do piloto.
4. Executar os testes do roteiro mestre, com conta/telefone de teste e sem
   benefício comercial real.
5. Só após Saipos, segurança, jurídico, prêmios/custos, equipe e piloto estarem
   aprovados, considerar publicar a V2.

## Limites importantes

- Não lançar a Roleta V2 nem o cadastro público: OTP e fluxo de venda paga ainda
  não estão prontos para operação.
- Não apagar tabelas, bucket ou dados antigos; seguir o plano de retenção e
  limpeza.
- Não versionar `.env.local`, token da Saipos, senha, PIN, QR, telefone ou dados
  de clientes.
- Há rascunhos locais não versionados em `src/app/api/roleta-v2/comandas/` e
  `supabase/migrations/202609120001_comandas_roleta_v2.sql`. Eles não foram
  revisados, aplicados ou publicados; manter fora de commits até uma tarefa
  dedicada de Saipos/comanda.

## Documentos históricos

Arquivos antigos podem explicar decisões passadas, mas não definem o estado atual:
`ARQUITETURA.md`, `DEPLOYMENT.md`, `IMPLEMENTACOES.md`, `STATUS_ALPHA.md`,
`docs/RECUPERACAO_2026-09-10.md`, `docs/AUDITORIA_E_CONTINUIDADE_2026-09-10.md`,
`docs/GUIA-INICIANTE.md` e `docs/GUIA-OPERACAO-E-TESTES.md`.

Quando houver divergência, este arquivo, o Roadmap e a auditoria técnica mais
recente vencem.
