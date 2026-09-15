# Privacidade e resposta a incidentes — Clube Cupim

Atualizado em 15/09/2026. Este documento é a referência de continuidade para
privacidade, segurança e resposta a incidentes. Não substitui aconselhamento
jurídico, contábil ou contratual.

## Decisão vigente

O Clube está em preparação e não deve ser aberto ao público nem receber uma
campanha real de roleta antes de cumprir os critérios de lançamento deste
documento e do `docs/ROADMAP.md`.

- Sorteio legado: **pausado**. Não há cron, publicação, leitura pública de
  ganhadores, distribuição aleatória ou reset de tickets.
- Tickets: **congelados**. Não representam entrada, chance, promessa de prêmio
  ou direito futuro; novas vendas passam a gerar somente pontos e cashback
  depois da aplicação da migração `202609140001_pausar_tickets_sorteio.sql`.
- Roleta V2: segue desligada e em modo de teste. A ativação depende de fonte
  confiável de venda paga, piloto fechado, regras comerciais e revisão de
  conformidade.
- Dados Saipos: nenhuma nova importação ampla deve ser feita até definir os
  campos mínimos, a origem autorizada e o acordo operacional com o fornecedor.

## Mapa de dados atual

| Grupo | Dados | Finalidade pretendida | Fonte | Estado |
| --- | --- | --- | --- | --- |
| Identificação | Nome, telefone, e-mail opcional | Conta, atendimento e acesso | Cliente/Saipos | Minimizar antes de importar |
| Autenticação | Hash do PIN, sessão, confirmação do telefone | Proteger conta e impedir acesso indevido | Cliente/sistema | PIN não pode ser exposto |
| Fidelidade | Pontos, cashback, nível, compras elegíveis, resgates e cupons | Operar o Clube e prevenir duplicidade | Saipos/sistema | Em revisão |
| Aniversário | Data de nascimento e aceite específico | Benefício de aniversário, se ativado | Cliente | Opcional; campanha desligada |
| Marketing | Finalidade, versão do texto, canal, data e hashes técnicos | Provar opt-in/opt-out de comunicação | Cliente/sistema | Opt-out ainda pendente |
| Segurança | Hashes de telefone/IP em OTP, logs operacionais e eventos de auditoria | Limites, fraude, investigação e prestação de contas | Sistema/equipe | Definir prazo de retenção |

Não importar para o Clube sem finalidade aprovada: dados de cartão ou pagamento,
CPF, endereço, observações internas, payload completo da Saipos, imagem de
documentos ou dados sensíveis. Foto de comanda é apoio operacional privado e
não é prova automática para liberar benefício.

## Regra de ouro de comunicação

O cadastro deve pedir só o necessário e explicar antes do envio:

1. Telefone: necessário para criar/proteger a conta e consultar o Clube.
2. Nome: identificação e atendimento.
3. Aniversário: opcional; só para benefício de aniversário.
4. Marketing: caixa separada, desmarcada, com texto versionado e saída simples.
5. Pontos e resgates não podem depender de autorizar marketing.

O aviso de privacidade está publicado em `/privacidade`, com canal inicial pelo
WhatsApp oficial. Antes de abertura pública, revisar juridicamente o aviso,
publicar as Regras do Clube e colocar em operação o canal verificável para
acesso, correção, exclusão quando cabível e descadastro.

## Papéis e acesso mínimo

| Papel | Pode | Não pode |
| --- | --- | --- |
| Caixa | Consultar e usar cupom no atendimento | Exportar base, alterar prêmios, cadastrar operadores |
| Gestor | Acompanhar operação e aprovar tarefas designadas | Conceder administração total ou apagar dados |
| Superadmin | Gerir acessos, segurança, incidentes e configurações | Usar conta compartilhada ou ignorar auditoria |

Cada funcionário deve ter e-mail e conta própria. Administradores devem usar
MFA no Supabase/Vercel/GitHub assim que os acessos reais forem criados.

## Plano de incidente

### Quando ativar contenção

Ativar se houver suspeita razoável de conta administrativa comprometida,
segredo exposto, acesso indevido à base, alteração inesperada de dados,
vazamento de backup, comportamento anômalo de integração ou alerta de
fornecedor.

### Primeiros 15 minutos

1. Registrar hora, quem recebeu o alerta e a origem; não apagar logs ou dados.
2. Ativar modo de contenção quando disponível: parar cadastro, OTP, roleta,
   cupons, cron Saipos e marketing.
3. Preservar evidências: IDs de requisição, telas, logs, contas, horários e
   integrações afetadas.
4. Suspender acessos suspeitos e trocar/rotacionar somente os segredos que
   possam ter sido expostos.
5. Avisar o responsável administrativo por canal seguro, sem incluir dados de
   clientes na mensagem.

### Até 24 horas

1. Classificar o incidente: sistema, período, dados, quantidade de titulares,
   causa provável e contenção realizada.
2. Verificar logs da Vercel, Supabase, Saipos e provedor de mensagem.
3. Definir se há risco ou dano relevante aos titulares com apoio jurídico,
   quando necessário.
4. Abrir registro de incidente com decisões, responsáveis e evidências.

### Comunicação externa

Se o incidente puder acarretar risco ou dano relevante, o controlador deve
comunicar ANPD e titulares no prazo aplicável. A referência operacional atual é
três dias úteis; confirmar circunstâncias e conteúdo com orientação jurídica
antes do envio. Manter registro de todos os incidentes, inclusive os que não
exijam comunicação externa.

### Retomada

Somente reabrir o sistema após corrigir a causa, revisar permissões e segredos,
validar restauração/consistência e registrar quem autorizou a retomada. A
reabertura deve exigir dupla confirmação administrativa quando o painel de
incidentes existir.

## Botão de pânico — escopo aprovado para implementação

O botão será disponível apenas para `superadmin`, com nova confirmação, motivo
obrigatório e auditoria. Ele não apagará dados. A ação deverá:

1. Criar número de incidente e evento imutável.
2. Ativar uma chave de contenção consultada por todas as rotas públicas e
   automações sensíveis.
3. Parar cadastro, OTP, login/resgate, Roleta V2, emissão/uso de cupons,
   sincronização Saipos e mensagens de marketing.
4. Manter apenas acesso administrativo de emergência para investigação.
5. Mostrar checklist, contatos, modelos de comunicação e histórico do caso.
6. Exigir revisão explícita para desativar a contenção.

O botão só será considerado pronto depois de teste controlado que comprove que
as rotas bloqueadas realmente param e que a reabertura é auditada.

## Critérios obrigatórios de lançamento

- [ ] Política de Privacidade e Regras do Clube publicadas e revisadas.
- [ ] Registro simplificado das operações de tratamento preenchido.
- [ ] Mapa de fornecedores, contratos e transferências de dados revisado.
- [ ] Marketing opcional, opt-out e pedido de direitos testados.
- [ ] Tickets e sorteio legado removidos da experiência pública.
- [ ] Permissões administrativas migradas para papéis operacionais.
- [ ] MFA configurado para contas administrativas reais.
- [ ] Backup criptografado, restauração isolada e evidência do teste.
- [ ] Monitoramento, plano de incidente e botão de contenção testados.
- [ ] Piloto fechado da Roleta V2 concluído sem prêmio real.

## Checkpoint técnico — 15/09/2026

- [x] Cron de sorteio removido da configuração Vercel no código.
- [x] Endpoints públicos de sorteio passam a responder `410` sem expor dados.
- [x] Criação, execução e reset do sorteio legado passam a responder `410`.
- [x] Área de resgate não exibe nem promete tickets/sorteio.
- [x] Migração para congelar novos tickets criada localmente.
- [x] Cadastro duplicado deixa de excluir registros automaticamente.
- [x] Migração de congelamento aplicada no Supabase em 14/09/2026; execução confirmada com sucesso no SQL Editor.
- [x] Checkpoint `fd476c1` enviado ao GitHub; deploy posterior `63ed036` confirmado `Ready` na Vercel em 15/09/2026.
- [x] Migração da central privada de incidentes aplicada no Supabase em 14/09/2026; tabelas, RLS e funções de ativação/reabertura confirmadas.
- [x] Painel de contenção, registro de incidente e bloqueio de rotas críticas implementados localmente.
- [x] Aviso público de privacidade adicionado em `/privacidade`, com vínculo no site e no cadastro.
- [ ] Testar contenção e reabertura controladas após o deploy, sem dados de clientes.
