# Roadmap do Projeto Fidelidade

Atualizado em 17/09/2026. Este é o roteiro operacional vigente; documentos históricos não substituem este arquivo nem a auditoria de continuidade.

## Objetivo

Operar um programa de fidelidade seguro, auditável e simples para clientes e equipe, começando por QR de roleta vinculado a uma venda efetivamente paga e terminando em cupom validado pela caixa.

## Estado resumido

| Frente | Estado | Próximo marco |
| --- | --- | --- |
| Recuperação, GitHub e Vercel | Concluído | Manter rotina de commits, deploy e confirmação Ready. |
| Base de fidelidade/Saipos | Prova de conceito validada parcialmente | Consulta posterior pelo ID impresso funciona; falta medir latência e a representação de cancelamento antes de conceder benefícios. |
| Operadores e auditoria | Em endurecimento | Papéis operacionais substituem token/allowlist legado; aplicar e verificar a migração crítica. |
| Cupons da operação | Parcial | Retirar gradualmente o validador legado e testar o fluxo novo com a caixa. |
| Roleta V2 | Piloto operacional estruturado, ainda fechado | Registrar uma comanda de teste, emitir QR de teste e medir a reconciliação Saipos. |
| WhatsApp OTP | Preparado, desligado | Escolher provedor oficial após adquirir o número comercial. |
| LGPD e operação pública | Em andamento | Contenção inicial, inventário, preferências, retenção, backup e revisão jurídica. |

## Concluído

- [x] Repositório recuperado no GitHub e produção vinculada à Vercel em `clubecupim.com.br`.
- [x] Projeto Supabase correto identificado: `asjoubgoccbvftyggunz`.
- [x] Migrações de base, cupons auditáveis, perfis operacionais/auditoria e preparação da Roleta V2 aplicadas.
- [x] Papéis `superadmin`, `gestor` e `caixa`, com tela de operadores, convite/suspensão e exclusão segura de usuário de teste.
- [x] Gestão de acessos é exclusiva de `superadmin`; catálogo de prêmios pode ser consultado por gestor, mas só superadmin o altera, com evento de auditoria.
- [x] Uso de cupom novo atômico e auditado para a operação de caixa.
- [x] Roleta V1 desligada na página pública e na API; prêmios V2 e publicação permanecem desativados.
- [x] Sessões QR V2 privadas: token aleatório armazenado somente como hash, expiração curta, nível/valor no servidor e trilha de operador.
- [x] Página cliente V2 e giro atômico no Supabase: telefone, consentimento opcional, prêmio por nível, cupom seguro e uso único do QR. V2 fechada e em modo de teste.
- [x] Tela `/caixa/roleta` para gerar QR temporário, ainda bloqueada enquanto a V2 não for publicada.
- [x] Execução do giro concedida somente ao `service_role` no Supabase; navegador e usuários comuns seguem sem acesso à função.
- [x] No piloto manual, somente gestor/superadmin pode gerar QR; o sistema calcula a faixa pelo valor (Brasa: até R$ 99,99; Chama: R$ 100–249,99; Nobre: R$ 250–399,99; Rei: R$ 400–499,99; Lenda: R$ 500+).
- [x] Next.js atualizado para `16.3.4`; última checagem de tipos aprovada e `32/32` testes unitários aprovados.
- [x] Sorteio legado integralmente pausado: cron, telas e rotas públicas/administrativas respondem sem expor histórico ou dados pessoais; novos tickets estão congelados no banco.
- [x] Central de incidente para superadmin, modo de contenção auditado e bloqueio das rotas públicas críticas implementados e aplicados no Supabase.
- [x] Aviso de privacidade público disponível em `/privacidade`, vinculado ao site e ao cadastro; ainda requer revisão jurídica e tabela final de retenção antes do lançamento.
- [x] Erro de build da página de resgate identificado e corrigido; deploy `63ed036` confirmado como `Ready` na Vercel em 15/09/2026.
- [x] Fluxo legado de garçons e seus “alertas” pausados: senhas previsíveis, ranking e leitura de telefone/IP não são mais acessíveis. A navegação passa a apontar para acessos individuais, Roleta V2, auditoria e central de incidentes; o relatório geral passou a contar somente giros V2.
- [x] Checkpoint `f59fd85` enviado ao GitHub e deploy de produção confirmado como `Ready` na Vercel em 16/09/2026.
- [x] Código: sessão de cliente deixou de reutilizar a chave de serviço; redefinição de PIN respeita contenção; consulta pública de resgate não enumera cadastro; roleta e sorteio legados ficam indisponíveis.
- [x] Infraestrutura: `202609160001_hardening_critico_legado.sql` aplicada e verificada no Supabase; `CUSTOMER_SESSION_SECRET` salvo como Secret de Production na Vercel. O próximo deploy em `main` vai consumi-lo.
- [x] Diagnóstico Saipos somente-leitura com token isolado: conexão confirmada e busca por valor/referência/campo temporal, sem persistir vendas ou dados de clientes.

## Em andamento

### Roleta V2 — desenho aprovado

Fluxo-alvo:

```text
Pagamento -> duas fotos privadas da comanda -> conferência dos campos pelo operador
-> QR de teste de uso único -> telefone + aviso/consentimento opcional de marketing
-> giro único no servidor -> cupom de teste -> reconciliação posterior Saipos -> auditoria
```

- [x] Fundação de sessão e QR seguro.
- [ ] Fonte imediata e confiável da venda paga. A Saipos é por consulta; o fluxo de foto é apenas evidência operacional e a reconciliação posterior ainda precisa dos testes de latência/cancelamento.
- [x] Piloto de comanda estruturado no Supabase em 17/09/2026: duas evidências privadas; OCR somente no navegador; campos confirmados pelo operador; ID do pedido impresso único; QR único de teste e trilha de auditoria. A Saipos entra depois na reconciliação, sem consequência automática.
- [x] Cron isolado de reconciliação preparado para implantação na Vercel: consulta apenas comandas de QR pendentes dos últimos três dias por `id_sale`, compara ID/total/pagamento/cancelamento e grava `compatível`, `divergente` ou pendente. Ele não cria clientes, pontos, cupons, prêmios ou sanções. Agenda: `0 10 * * *` (janela de 07:00–07:59 BRT no Hobby). O primeiro resultado útil depende de uma comanda registrada pelo novo fluxo.
- [x] Página pública `/roleta/v2` que lê uma sessão sem expor dados sensíveis.
- [x] Registro de telefone, consentimento opcional e giro único atômico.
- [x] Seleção de prêmio no servidor, ponderada pelos cinco níveis e custo estimado.
- [x] Emissão de cupom V2 com dias úteis, feriados, canal e expiração.
- [x] Tela/rota de caixa para consulta, confirmação e auditoria do cupom V2; a recusa ainda será desenhada com motivo obrigatório.
- [x] Geração manual do QR protegida para piloto: sem escolha manual de nível e sem permissão para perfil `caixa` emitir prêmio.
- [ ] Piloto fechado com compras reais antes de publicar a V2.

### Saipos — reconciliação em validação

Não publicar o fluxo comercial baseado apenas em foto de comanda. Foto pode ser alterada ou reutilizada; no piloto fechado, ela é evidência privada acompanhada de confirmação do operador e QR sem valor comercial. A pergunta completa e os dados técnicos que precisamos estão em `docs/SAIPOS_VALIDACAO_COMANDA.md`.

Em 18/09, o pedido impresso `872482756` conciliou posteriormente com venda não
cancelada e pagamento retornado. Já pedidos de mesas encerradas sem itens e
buscas pelo número físico da mesa não retornaram resultado. O **ID do Pedido
impresso** passa a ser obrigatório na evidência; o teste pendente deve provar
como a API representa cancelamentos e em quanto tempo cada tipo de venda fica
disponível.

Decisão após a resposta:

1. **Webhook de venda paga:** usar como fonte principal, com assinatura e idempotência.
2. **Consulta individual confiável por pedido/nota:** usar como alternativa imediata sob demanda.
3. **Somente consulta em lote/noturna:** operar apenas o piloto de QR de teste, fazer reconciliação posterior e não aplicar punição, pontos ou benefício comercial até a regra ser formalmente aprovada.

## Próximas prioridades independentes da Saipos

1. [x] Restringir importação de planilha a superadmin, com limite de 2 MB e 2.000 linhas por envio. Planejar a substituição de `xlsx` (alertas altos conhecidos) continua pendente.
2. [Em andamento] Completar a matriz única de permissões: endpoints que antes aceitavam token/allowlist agora exigem papel operacional; falta validar os papéis em produção e cobrir auditoria obrigatória para todos os escritores administrativos.
3. Consolidar cupom novo e remover o caminho legado quando o teste de caixa for concluído.
4. [Em andamento] Preferência de marketing/opt-out do cliente implementada: o portal permite revogar WhatsApp promocional ou aniversário, com evidência e auditoria. Falta testar ponta a ponta, definir canal formal de direitos e fechar o plano de retenção. O aviso público, a central de incidente, o modo de contenção e o bloqueio de rotas críticas já foram preparados; o checkpoint está em `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`.
5. [Em andamento] Criar backup/restauração testável do Supabase e alertas de cron.
6. Escolher WhatsApp Business Platform/Cloud API ou BSP oficial; não automatizar WhatsApp pessoal.
7. Depois do piloto V2, remover telas, rotas e tabelas legadas que não forem mais referenciadas. O plano está em `docs/LIMPEZA_DO_LEGADO.md`.
8. Executar o roteiro mestre de testes gradualmente, sem usar clientes reais: `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`.

## Critério para abrir ao público

Nada de roleta ou campanha real antes de todos os itens abaixo:

- [ ] Validação da venda paga contra Saipos ou alternativa formalmente aprovada.
- [ ] QR -> telefone -> giro -> cupom -> caixa -> auditoria testado de ponta a ponta.
- [ ] Prêmios, validade, dias bloqueados e custo aprovados pelo negócio.
- [ ] Política de privacidade e consentimento de marketing publicados; opt-out testado.
- [ ] Revisão jurídica da ação promocional baseada em prêmios aleatórios.
- [ ] Backup e restauração do Supabase validados.
- [ ] Dois acessos reais de caixa e um de gestor, todos individuais, configurados.
- [ ] Botão de contenção e procedimento de incidente testados em ambiente controlado.

## Rotina de cada alteração

1. Alterar uma frente pequena e delimitada.
2. Executar testes proporcionais ao risco.
3. Registrar o estado neste roadmap e, quando necessário, na auditoria.
4. Commit no GitHub e deploy pela Vercel.
5. Confirmar que o deploy está `Ready` antes de considerar a mudança entregue.
