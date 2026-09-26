# Roadmap do Projeto Fidelidade

Atualizado em 26/09/2026. Este é o roteiro operacional vigente; documentos históricos não substituem este arquivo nem a auditoria de continuidade.

## Objetivo

Operar um programa de fidelidade seguro, auditável e simples para clientes e equipe, começando por QR de roleta vinculado a uma venda efetivamente paga e terminando em cupom validado pela caixa.

## Estado resumido

| Frente | Estado | Próximo marco |
| --- | --- | --- |
| Recuperação, GitHub e deploy Vercel | Deploy funcional; plano comercial pendente | Confirmar Ready em cada mudança e resolver hospedagem permitida para uso comercial antes da abertura. |
| Pontuação diária Saipos | **Pausada; não agenda nem credita pontos** | Reconstruir para contas verificadas, testar pagamentos/cancelamentos, ordenar vendas e agendar com observabilidade. |
| Níveis de 90 dias | Cálculo atual não é janela móvel real | Recalcular o gasto elegível por data para permitir subida e descida sem apagar pontos. |
| Saipos e QR da roleta | Prova de conceito validada parcialmente | Consulta posterior pelo ID impresso funciona; medir latência/cancelamento e concluir piloto antes de conceder prêmio comercial. |
| Entregas Saipos | Diagnóstico somente-leitura publicado; compensação por atraso em standby | Retomar apenas se a Saipos disponibilizar origem confiável por pedido via API ou outro mecanismo autorizado e verificável. |
| Operadores e auditoria | Base operacional concluída; validação pendente | Papéis e rotas pós-login estão separados; validar no próximo piloto com contas reais de teste. |
| Cupons da operação | Parcial | Retirar gradualmente o validador legado e testar o fluxo novo com a caixa. |
| Roleta V2 | Piloto técnico não comercial ativo | Mesa 200 emitiu QR e girou em 26/09; conferir reconciliação automática posterior e completar cenários negativos. |
| WhatsApp OTP | Preparado, desligado | Escolher provedor oficial após adquirir o número comercial. |
| LGPD e operação pública | Em andamento | Contenção inicial, inventário, preferências, retenção, backup e revisão jurídica. |

## Concluído

- [x] Repositório recuperado no GitHub e produção vinculada à Vercel em `clubecupim.com.br`.
- [x] Projeto Supabase correto identificado: `asjoubgoccbvftyggunz`.
- [x] Migrações de base, cupons auditáveis, perfis operacionais/auditoria e preparação da Roleta V2 aplicadas.
- [x] Papéis `superadmin`, `gestor`, `caixa` e `garcom`, com tela de operadores, convite/suspensão e exclusão segura de usuário de teste.
- [x] Gestão de acessos é exclusiva de `superadmin`; catálogo de prêmios pode ser consultado por gestor, mas só superadmin o altera, com evento de auditoria.
- [x] Uso de cupom novo atômico e auditado para a operação de caixa.
- [x] Roleta V1 desligada na página pública e na API; prêmios V2 comerciais permanecem desativados.
- [x] Sessões QR V2 privadas: token aleatório armazenado somente como hash, expiração curta, nível/valor no servidor e trilha de operador.
- [x] Página cliente V2 e giro atômico no Supabase: telefone, consentimento opcional, prêmio por nível, cupom seguro e uso único do QR. V2 aberta somente no modo de teste não comercial.
- [x] Piloto técnico ativado no Supabase: QR de 10 minutos, somente o prêmio interno `piloto_interno_sem_valor_v2` (custo R$ 0,00) e baixa de cupom bloqueada pelo banco enquanto `v2_modo_teste=true`.
- [x] Execução do giro concedida somente ao `service_role` no Supabase; navegador e usuários comuns seguem sem acesso à função.
- [x] Matriz de permissões aplicada em 18/09 e encaminhamento de login corrigido em `f436a6d`: garçom emite QR pelo fluxo de duas fotos; caixa só valida cupom; gestor visualiza o painel sem alterar; superadmin é o único papel administrativo com escrita. O sistema calcula a faixa pelo valor: até R$ 100; R$ 100,01–200; R$ 200,01–300; R$ 300,01–400; R$ 400,01–500; e acima de R$ 500. Ver `docs/PERMISSOES_OPERACIONAIS.md`.
- [x] Next.js atualizado para `16.3.4`; build de produção e `60/60` testes unitários aprovados em 26/09/2026.
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

#### Decisão comercial em rascunho — 25/09/2026

- Manter somente os dois descontos de 10% já previstos no catálogo: um para a próxima compra no salão e outro para o próximo pedido delivery, ambos com teto de R$ 100. Não criar prêmio de 20%.
- O teto só limita o desconto a partir de uma compra futura de R$ 1.000; validar custo, prazo de validade, acumulação e pesos/chances antes de ativar qualquer prêmio comercial.
- O prêmio futuro deve ficar associado à conta do cliente após verificação do telefone. Um QR de apresentação poderá ser recuperado nessa conta para a caixa/atendimento consultar e dar baixa uma única vez; o QR não substitui a prova de acesso ao telefone.
- A verificação por WhatsApp depende de número comercial e provedor oficial ainda não contratados. Esta frente fica em espera; os prêmios seguem em rascunho e o piloto permanece sem valor comercial. Marketing continua opcional e separado de códigos de autenticação.
- Antes da abertura, revisar juridicamente o enquadramento da roleta aleatória. Os detalhes operacionais de resgate e o prazo dos descontos ainda não foram aprovados.

Fluxo-alvo:

```text
Pagamento -> duas fotos privadas da comanda -> conferência dos campos pelo operador
-> QR de teste de uso único -> telefone + aviso/consentimento opcional de marketing
-> giro único no servidor -> cupom de teste -> reconciliação posterior Saipos -> auditoria
```

- [x] Fundação de sessão e QR seguro.
- [ ] Fonte imediata e confiável da venda paga. A Saipos é por consulta; o fluxo de foto é apenas evidência operacional e a reconciliação posterior ainda precisa dos testes de latência/cancelamento.
- [x] Piloto de comanda estruturado no Supabase: duas evidências privadas; OCR somente no navegador; mesa, abertura, ID e valor precisam ser lidos antes de seguir; o garçom digita somente o valor para dupla conferência; QR único de teste e trilha de auditoria. A Saipos entra depois na reconciliação, sem consequência automática.
- [x] Cron isolado de reconciliação preparado para implantação na Vercel: consulta automaticamente as comandas de QR pendentes por `id_sale`, ampliando a janela até a pendência mais antiga (teto de 90 dias), compara ID/total/pagamento/cancelamento e grava `compatível`, `divergente` ou pendente. Ele não cria clientes, pontos, cupons, prêmios ou sanções. Agenda: `0 10 * * *` (janela de 07:00–07:59 BRT no Hobby). O primeiro resultado útil depende de uma comanda registrada pelo novo fluxo.
- [x] Relatório operacional diário em `/admin/operacao-roleta`: mostra comandas, QR emitidos, compatibilidade, pendências, faixa e sinal de atenção por operador. O sinal não é penalidade nem bloqueio automático; serve para a gestão revisar evidências e treinamento.
- [x] Página pública `/roleta/v2` que lê uma sessão sem expor dados sensíveis.
- [x] Registro de telefone, consentimento opcional e giro único atômico.
- [x] Seleção de prêmio no servidor, ponderada pelas seis faixas da conta. A roda visual termina no prêmio retornado pelo banco.
- [x] Nova interface da roleta e do catálogo inspirada na identidade pública do Rei do Cupim (preto, vermelho e dourado). O prêmio de teste fica separado dos rascunhos comerciais; durante o piloto, a API impede ativação de prêmio comercial pela gestão.
- [ ] Revisar a experiência real da roleta no celular: a versão técnica existe, mas o teste de 26/09 mostrou excesso de texto, roda pouco imersiva e resultado de teste visualmente fraco. Fazer protótipo com a referência que o responsável enviará e validar legibilidade/interação em aparelhos reais antes de marcar a frente visual como pronta para lançamento.
- [ ] Trocar a coroa genérica pela logomarca oficial aprovada, inclusive no centro da roleta e nas telas do cliente; não tratar a paleta de cores atual como identidade final.
- [ ] Simplificar entrada, participação e resultado aos dados indispensáveis; usar produtos/fotos reais aprovados nos prêmios comerciais, sem exibir código técnico como elemento principal ao cliente. Manter aviso de teste claro enquanto o piloto não tiver valor comercial.
- [ ] Revisar o formulário de telefone, os termos do programa e o aviso de privacidade em uma interface curta e acessível. O consentimento para promoções no WhatsApp deve permanecer separado, opcional e sem marcação prévia até revisão jurídica; testar também o cancelamento das mensagens.
- [x] Limpeza das fotos após 36 horas não remove as comandas do relatório e da lista operacional; os metadados continuam disponíveis para conferência posterior.
- [x] Emissão de cupom V2 com dias úteis, feriados, canal e expiração.
- [x] Tela/rota de caixa para consulta, confirmação e auditoria do cupom V2; a recusa ainda será desenhada com motivo obrigatório.
- [x] Geração manual do QR protegida para piloto: sem escolha manual de nível e sem permissão para perfil `caixa` emitir prêmio.
- [ ] Piloto fechado com compras reais antes de publicar a V2.
- [ ] Corrigir a identidade dos ícones do site antes do lançamento. Em 26/09, a produção ainda servia `src/app/favicon.ico` com o triângulo padrão da Vercel e também `src/app/icon.png` com a chama genérica; o Next.js publica ambos como `rel="icon"`. Falta receber a arte oficial aprovada do Rei do Cupim, gerar ícones coerentes para navegador e tela inicial do celular, substituir os arquivos e conferir o resultado em produção (inclusive cache do navegador).

### Saipos — reconciliação em validação

Em 26/09, a página `/admin/saipos/entregas` e o menu administrativo agrupado foram publicados. A primeira consulta de produção, sem criar cupons nem alterar pedidos, retornou 100 vendas e 49 entregas naquele momento. Em 43 entregas havia o nome da **loja no parceiro**; em seis, não. Esse campo não identifica a plataforma nem comprova canal próprio. O histórico de status falhou na primeira consulta (código diagnóstico 503), mas respondeu na repetição: 104 vendas, 51 entregas, com 36 na última etapa “ENTREGUE/PAGO E FINALIZADO”, seis em “SAIU PARA ENTREGA” e nove na etapa de cozinha. Isso demonstra disponibilidade intermitente do endpoint; não comprova atraso. Não ativar compensação até validar origem, prazo prometido e horário efetivo de entrega em pedidos conhecidos.

**Decisão de 26/09: compensação automática por atraso em standby.** O pedido delivery nº 1 (ID Saipos `882420214`) foi confirmado pelo responsável como criado diretamente na Saipos, mas seu retorno tem `partner_sale.desc_store_partner` preenchido. Logo, nem a presença de `partner_sale` nem o nome da loja servem para separar canal próprio de marketplace. A documentação da API de Dados não apresenta um campo de origem/plataforma por venda; o relatório **Vendas por período** do sistema Saipos oferece filtro manual “Canal/Origem da venda”, mas isso não equivale a um identificador disponível nesta API. Manter a página de diagnóstico e históricos, sem classificação automática, sem cupom e sem excluir código ou dados. Reabrir somente com campo oficial confiável ou integração aprovada que permita validar a origem por pedido; então validar também unidade/fuso do prazo, sem usar status “finalizado” como prova independente de entrega física.

Não publicar o fluxo comercial baseado apenas em foto de comanda. Foto pode ser alterada ou reutilizada; no piloto fechado, ela é evidência privada acompanhada de confirmação do operador e QR sem valor comercial. A pergunta completa e os dados técnicos que precisamos estão em `docs/SAIPOS_VALIDACAO_COMANDA.md`.

Em 18/09, o pedido impresso `872482756` conciliou posteriormente com venda não
cancelada e pagamento retornado. Já pedidos de mesas encerradas sem itens e
buscas pelo número físico da mesa não retornaram resultado. O **ID do Pedido
impresso** passa a ser obrigatório na evidência; o teste pendente deve provar
como a API representa cancelamentos e em quanto tempo cada tipo de venda fica
disponível. A reconciliação também compara a faixa registrada para o QR com a
faixa que o total da Saipos deveria gerar.

Em 25/09, o primeiro QR da Mesa 200 (R$ 220,00) foi confirmado na Saipos:
ID, total, pagamento e não cancelamento bateram. O alerta de faixa era falso
positivo porque a emissão usou a regra anterior de cinco faixas; agora a
versão da regra fica registrada por comanda e a retificação foi auditada.
O relatório do dia mostra uma comanda compatível. Isso ainda não prova
disponibilidade imediata da venda nem o comportamento de cancelamentos.

Em 26/09, novo teste controlado: a Mesa 200, ID Saipos `882731373`, R$ 259,16,
consta não cancelada e com pagamento de R$ 259,16. O Clube registrou duas fotos,
emitiu um QR de teste às 14:42 e auditou um giro/cupom de teste às 14:44.
A reconciliação ainda estava pendente no painel antes da janela automática do
dia seguinte. A retirada/balcão, ID Saipos `882731058`, R$ 22,00, também consta
não cancelada, mas não é comanda da roleta e não aparece no painel de comandas.
Os números curtos mesa 200 e balcão 140 não são localizáveis na API de Dados;
usar o ID completo da venda. O método da retirada veio descrito como `Vale` e
o da mesa como `Pagamento não cadastrado`; ambos retornaram o valor integral.

Decisão após a resposta:

1. **Webhook de venda paga:** usar como fonte principal, com assinatura e idempotência.
2. **Consulta individual confiável por pedido/nota:** usar como alternativa imediata sob demanda.
3. **Somente consulta em lote/noturna:** operar apenas o piloto de QR de teste, fazer reconciliação posterior e não aplicar punição, pontos ou benefício comercial até a regra ser formalmente aprovada.

### Pontuação diária, identidade e níveis — revisão de 26/09/2026

**Não confundir os dois trabalhos das 07h:** o único cron Saipos agendado em
`vercel.json` é `/api/cron/reconciliar-comandas-roleta`, que confere comandas
com QR já emitido e **não concede pontos**. O processador antigo de vendas
(`/api/cron/saipos`, manual, histórico e webhook) responde como pausado e não
deve ser religado apenas trocando uma flag: ele tentaria criar cadastro para
todo comprador identificado por telefone/CPF, contrariando o objetivo de
pontuar somente participantes do Clube. Nenhum pedido precisa ser digitado
manualmente para pontuar no desenho futuro: a API fornecerá `id_sale` para
deduplicação e o telefone com DDD para localizar uma conta verificada.

Fluxo-alvo proposto (ainda **não implementado nem aprovado para produção**):

```text
Vendas Saipos do período -> verificar origem elegível, pagamento e cancelamento
-> normalizar telefone com DDD -> localizar conta já cadastrada/verificada
-> ordenar compras pela data da venda -> creditar uma vez por id_sale
-> recalcular nível pela janela móvel de 90 dias -> relatório e alerta de falha
```

- [x] Primeira base isolada em código e testes: a identificação recusa CPF/nome, telefone sem DDD, conta não verificada e duplicidade; o cálculo de referência soma somente compras dentro dos últimos 90 dias. **Ainda não está ligado ao processador nem altera saldos reais.**
- [x] Diagnóstico administrativo agregado em `/admin/saipos/telefones`: consulta vendas de um dia, informa cobertura de telefone com DDD e repetições por tipo de venda, sem devolver números ou cadastrar clientes. O diagnóstico individual em `/admin/saipos` mostra apenas se a venda tem telefone com DDD. Eles medem a hipótese, mas **não classificam canal nem concedem pontos**.
- [ ] Aprovar a elegibilidade: somente cliente com telefone comprovado e conta concluída recebe pontos/cashback; não criar perfis, saldos ou logs individuais para todos os compradores da Saipos. Não usar CPF isoladamente para atribuir a compra a uma conta.
- [ ] Decidir a primeira compra: proposta de reconhecer compra anterior ao cadastro por até **7 dias**, somente após verificação do mesmo telefone; prazo e marco inicial dependem de aprovação do responsável. Sem guardar venda de não participante no Clube apenas para essa possibilidade.
- [ ] Confirmar em exemplos reais que a API retorna telefone com DDD 85 para balcão, salão e delivery; número curto de mesa/balcão não substitui `id_sale`. Testar ausência, duplicidade, troca de telefone e mais de uma conta candidata sem crédito ambíguo.
- [ ] Comprovar um campo confiável de origem/canal para excluir iFood, 99Food e outros marketplaces. `partner_sale`/nome da loja não servem. Até lá, **não automatizar pontos de delivery**; validar separadamente a classificação de salão e balcão para um piloto restrito.
- [ ] Testar a hipótese do telefone com amostras rotuladas da própria operação: pelo menos um pedido direto Saipos, um iFood e um 99Food, comparando apenas presença/formato/repetição do número, sem divulgar telefone real no relatório. A [Saipos informa que integrações como iFood podem não enviar o telefone](https://meajuda.saipos.com/hc/pt-br/articles/31349900338836-Rastreamento-e-acompanhamento-de-entregas); isso não comprova que **todos** os pedidos desses canais venham sem número ou com número padrão, especialmente pedidos lançados manualmente.
- [ ] Definir e testar venda efetivamente paga, cancelada, estornada, pagamento parcial e falha/atraso da API. O total e a soma de pagamentos devem conferir; uma venda não localizada permanece pendente, sem crédito presumido.
- [ ] Substituir o processador legado por uma rotina que consulta em lotes/dias com paginação e retentativa limitadas, aplica o filtro antes de escrever no banco, ordena pela hora real da compra e mantém `id_sale` idempotente. Evitar um log de duplicidade para cada venda reconsultada diariamente.
- [ ] Implementar **janela móvel real de 90 dias** usando o histórico de compras elegíveis, inclusive queda de nível quando compras antigas saem da janela. O benefício de cada compra usa o nível imediatamente anterior a ela; reprocessamentos tardios não podem mudar pontos de modo arbitrário.
- [ ] Separar claramente saldo de pontos/cashback do nível: resgate desconta só o custo do benefício (saldo zera apenas se for todo gasto), nunca o gasto dos 90 dias. Testar resgate simultâneo, saldo insuficiente e baixa do cupom no caixa.
- [ ] Criar relatório diário por venda/conta com estados `creditada`, `já creditada`, `não elegível`, `pendente` e `erro`, sem expor telefones completos; registrar início/fim, quantidade e falhas do cron e alertar a gestão se não executar. Não depender de acesso manual ao painel para processar o dia.
- [ ] Agendar a rotina de pontos de forma compatível com o plano de hospedagem aprovado. A janela desejada é 07:00 de Fortaleza (10:00 UTC), mas no Hobby a Vercel não garante o minuto exato dentro da hora; prever retomada após indisponibilidade sem dupla contagem.
- [ ] Pilotar com os IDs Saipos `882731373` (mesa 200) e `882731058` (retirada), sem crédito retroativo real antes de revisar elegibilidade e telefone; depois testar compras consecutivas no mesmo dia, compra sem cadastro, cancelamento/estorno e uma semana sem abrir o painel.
- [ ] Revisar o cron da roleta separadamente: hoje limita a consulta a 5 páginas de 200 vendas e até 100 comandas por execução. Uma pendência antiga pode alargar a busca a 90 dias e ultrapassar o teto; dividir por dia ou usar consulta oficial por ID antes de confiar nesse caminho em volume.

### Custos, hospedagem e continuidade — revisão de 26/09/2026

Medição dos painéis em 26/09, **não uma projeção do lançamento**: a organização
Supabase mostrava 33/500 MB de banco, armazenamento de arquivos arredondado
para 0,00/1 GB e 2/50.000 usuários ativos; a equipe Vercel mostrava, nos
últimos 30 dias, 715/1.000.000 invocações de funções e 210,74 MB/100 GB de
transferência rápida. Esses totais incluem outros projetos das mesmas contas.
O consumo atual é baixo, mas não valida o custo com clientes reais.

- [ ] Resolver **antes do uso comercial**: o projeto está na Vercel Hobby, cujo [uso é restrito a projetos pessoais não comerciais](https://vercel.com/docs/limits/fair-use-guidelines). Escolher Pro (preço-base anunciado de US$ 20/mês, sujeito a impostos/excedentes) ou hospedagem alternativa que permita operação comercial. Não mudar plano ou contratar sem autorização do responsável.
- [ ] Definir backup/restauração para o Supabase antes de confiar saldos reais ao banco. O [Free não inclui backup automático](https://supabase.com/pricing); avaliar procedimento externo testado ou Pro (preço-base anunciado de US$ 25/mês). Não confundir espaço disponível com proteção contra perda de dados.
- [ ] Medir banco, arquivos privados, egress e erros semanalmente no piloto; verificar a limpeza das fotos de comanda após 36 horas (remoção física pode passar disso pela agenda diária) e estabelecer alertas antes dos limites do plano.
- [ ] Manter GitHub Free enquanto o uso de repositório/Actions estiver dentro das [cotas oficiais](https://github.com/pricing); revisar também custo do domínio e do futuro provedor WhatsApp, que não estão incluídos nos números acima.

## Próximas prioridades independentes da Saipos

1. [x] Restringir importação de planilha a superadmin, com limite de 2 MB e 2.000 linhas por envio. Em 22/09, `xlsx` foi atualizado para 0.20.3 pelo canal oficial do SheetJS; `npm audit` passou sem vulnerabilidades.
2. [Em andamento] Validar em produção a matriz única de permissões e o encaminhamento pós-login com uma conta de cada papel; cobrir auditoria obrigatória para todos os escritores administrativos.
   - Em 25/09, a checagem estática das rotas sensíveis não encontrou liberação indevida evidente. O guard de papéis passou a negar valores desconhecidos explicitamente e ganhou testes unitários da matriz. Ainda falta o teste real em produção com as quatro contas e a verificação da trilha de cada escrita.
   - A inclusão/remoção de clientes convidados do piloto agora usa uma função transacional: a mudança e o evento administrativo são inseparáveis. Ainda falta revisar os demais escritores administrativos, especialmente catálogo de produtos e importações.
3. Consolidar cupom novo e remover o caminho legado quando o teste de caixa for concluído.
4. [Em andamento] Preferência de marketing/opt-out do cliente implementada: o portal permite revogar WhatsApp promocional ou aniversário, com evidência e auditoria. Falta testar ponta a ponta, definir canal formal de direitos e fechar o plano de retenção. O aviso público, a central de incidente, o modo de contenção e o bloqueio de rotas críticas já foram preparados; o checkpoint está em `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`.
5. [Em andamento] Criar backup/restauração testável do Supabase e alertas de cron. O projeto está no plano Free, que não oferece backups agendados; definir armazenamento protegido e testar a restauração isolada antes da abertura.
6. Escolher WhatsApp Business Platform/Cloud API ou BSP oficial; não automatizar WhatsApp pessoal.
7. Depois do piloto V2, remover telas, rotas e tabelas legadas que não forem mais referenciadas. O plano está em `docs/LIMPEZA_DO_LEGADO.md`.
8. Executar o roteiro mestre de testes gradualmente, sem usar clientes reais: `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`.

## Critério para abrir ao público

Nada de roleta ou campanha real antes de todos os itens abaixo:

- [ ] Validação da venda paga contra Saipos ou alternativa formalmente aprovada.
- [ ] Pontuação diária restrita a contas verificadas, com origem elegível, idempotência, relatório de exceções e testes de cancelamento/estorno; não reativar o processador legado.
- [ ] Janela móvel de 90 dias correta, inclusive descida de nível; pontos/cashback e resgates conferidos em testes de ponta a ponta.
- [ ] QR -> telefone -> giro -> cupom -> caixa -> auditoria testado de ponta a ponta.
- [ ] Prêmios, validade, dias bloqueados e custo aprovados pelo negócio.
- [ ] Política de privacidade e consentimento de marketing publicados; opt-out testado.
- [ ] Revisão jurídica da ação promocional baseada em prêmios aleatórios.
- [ ] Backup e restauração do Supabase validados.
- [ ] Hospedagem autorizada para uso comercial e orçamento de Vercel/Supabase/WhatsApp aprovados, com alertas de consumo.
- [ ] Dois acessos reais de caixa e um de gestor, todos individuais, configurados.
- [ ] Botão de contenção e procedimento de incidente testados em ambiente controlado.

## Rotina de cada alteração

1. Alterar uma frente pequena e delimitada.
2. Executar testes proporcionais ao risco.
3. Registrar o estado neste roadmap e, quando necessário, na auditoria.
4. Commit no GitHub e deploy pela Vercel.
5. Confirmar que o deploy está `Ready` antes de considerar a mudança entregue.

## Checkpoint de continuidade — 21/09/2026

- O lembrete do piloto foi cancelado a pedido do responsável; o teste de três cenários continua pendente e não deve ser considerado executado.
- A referência Saipos `872482756` (Mesa 99, R$ 274,45) permanece somente como confirmação de consulta posterior por ID do Pedido, não como prova de disponibilidade em tempo real.
- O estado comercial continua bloqueado: V2 em piloto técnico, prêmio interno sem custo, sem pontos, sem cupom utilizável e sem divulgação a clientes.
- O guia de troca de computador é `docs/RETOMADA_EM_NOVO_COMPUTADOR.md`. O rascunho local de migração de 12/09 foi preservado fora do Git e não compõe a produção.
