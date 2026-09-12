# Roadmap do Projeto Fidelidade

Atualizado em 12/09/2026. Este é o roteiro operacional vigente; documentos históricos não substituem este arquivo nem a auditoria de continuidade.

## Objetivo

Operar um programa de fidelidade seguro, auditável e simples para clientes e equipe, começando por QR de roleta vinculado a uma venda efetivamente paga e terminando em cupom validado pela caixa.

## Estado resumido

| Frente | Estado | Próximo marco |
| --- | --- | --- |
| Recuperação, GitHub e Vercel | Concluído | Manter rotina de commits, deploy e confirmação Ready. |
| Base de fidelidade/Saipos | Parcial | Confirmar contrato de venda paga, cancelamento e consulta imediata com a Saipos. |
| Operadores e auditoria | Parcial | Unificar permissões finas e cobrir toda ação sensível em auditoria. |
| Cupons da operação | Parcial | Retirar gradualmente o validador legado e testar o fluxo novo com a caixa. |
| Roleta V2 | Pronta para piloto fechado | Validar uma venda paga por fonte confiável e testar ponta a ponta. |
| WhatsApp OTP | Preparado, desligado | Escolher provedor oficial após adquirir o número comercial. |
| LGPD e operação pública | Pendente | Política, preferências, opt-out, retenção e revisão jurídica. |

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
- [x] Next.js atualizado para `16.3.4`; última checagem de tipos aprovada e `30/30` testes unitários aprovados.

## Em andamento

### Roleta V2 — desenho aprovado

Fluxo-alvo:

```text
Venda paga na Saipos -> confirmação automática no sistema -> nível da compra
-> QR de uso único -> telefone + aviso/consentimento opcional de marketing
-> giro único no servidor -> cupom com prazo/regras -> validação pela caixa -> auditoria
```

- [x] Fundação de sessão e QR seguro.
- [ ] Fonte automática e confiável da venda paga. **Bloqueada pela resposta da Saipos.**
- [x] Página pública `/roleta/v2` que lê uma sessão sem expor dados sensíveis.
- [x] Registro de telefone, consentimento opcional e giro único atômico.
- [x] Seleção de prêmio no servidor, ponderada pelos cinco níveis e custo estimado.
- [x] Emissão de cupom V2 com dias úteis, feriados, canal e expiração.
- [x] Tela/rota de caixa para consulta, confirmação e auditoria do cupom V2; a recusa ainda será desenhada com motivo obrigatório.
- [x] Geração manual do QR protegida para piloto: sem escolha manual de nível e sem permissão para perfil `caixa` emitir prêmio.
- [ ] Piloto fechado com compras reais antes de publicar a V2.

### Saipos — dependência em espera

Não executar nem publicar o fluxo baseado apenas em foto de comanda. Foto pode ser alterada ou reutilizada; ela pode servir de apoio visual, mas não como aprovação automática. A pergunta completa e os dados técnicos que precisamos estão em `docs/SAIPOS_VALIDACAO_COMANDA.md`.

Decisão após a resposta:

1. **Webhook de venda paga:** usar como fonte principal, com assinatura e idempotência.
2. **Consulta individual confiável por pedido/nota:** usar como alternativa imediata sob demanda.
3. **Somente consulta em lote/noturna:** QR fica pendente até sincronização ou revisão humana; não há liberação automática no salão.

## Próximas prioridades independentes da Saipos

1. [x] Restringir importação de planilha a superadmin, com limite de 2 MB e 2.000 linhas por envio. Planejar a substituição de `xlsx` (alertas altos conhecidos) continua pendente.
2. Completar a matriz única de permissões: gestão de acessos e alteração de prêmios já usam papéis operacionais; faltam os demais endpoints administrativos sensíveis.
3. Consolidar cupom novo e remover o caminho legado quando o teste de caixa for concluído.
4. Criar política de privacidade, preferência de marketing/opt-out e plano de retenção com revisão jurídica.
5. Criar backup/restauração testável do Supabase e alertas de cron.
6. Escolher WhatsApp Business Platform/Cloud API ou BSP oficial; não automatizar WhatsApp pessoal.
7. Depois do piloto V2, remover telas, rotas e tabelas legadas que não forem mais referenciadas. O plano está em `docs/LIMPEZA_DO_LEGADO.md`.

## Critério para abrir ao público

Nada de roleta ou campanha real antes de todos os itens abaixo:

- [ ] Validação da venda paga contra Saipos ou alternativa formalmente aprovada.
- [ ] QR -> telefone -> giro -> cupom -> caixa -> auditoria testado de ponta a ponta.
- [ ] Prêmios, validade, dias bloqueados e custo aprovados pelo negócio.
- [ ] Política de privacidade e consentimento de marketing publicados; opt-out testado.
- [ ] Revisão jurídica da ação promocional baseada em prêmios aleatórios.
- [ ] Backup e restauração do Supabase validados.
- [ ] Dois acessos reais de caixa e um de gestor, todos individuais, configurados.

## Rotina de cada alteração

1. Alterar uma frente pequena e delimitada.
2. Executar testes proporcionais ao risco.
3. Registrar o estado neste roadmap e, quando necessário, na auditoria.
4. Commit no GitHub e deploy pela Vercel.
5. Confirmar que o deploy está `Ready` antes de considerar a mudança entregue.
