# Auditoria e continuidade — Clube Cupim

Atualizado em 11/09/2026. Este é o ponto de retomada oficial do projeto.

## Progresso de segurança — 11/09/2026

1. Next.js e `eslint-config-next` foram atualizados de `16.1.2` para `16.3.4`.
   A auditoria de dependências caiu de **7 alertas (1 crítico, 5 altos e 1 moderado)**
   para **2 altos**, ambos ligados à importação de planilhas: `xlsx` e a dependência
   indireta `ws`. Não existe correção automática para `xlsx`; a importação continua
   restrita a superadmin e deve ser substituída ou isolada antes da abertura pública.
2. A roleta legada foi desligada de fato: `/roleta` agora informa que a V2 está em
   preparação e `POST /api/roleta/girar` responde `503`. Portanto, ninguém consegue
   mais distribuir prêmios pelo desenho antigo, mesmo chamando a API diretamente.
3. A configuração duplicada `next.config.js` foi removida; `next.config.ts` é a única
   fonte de configuração do framework.
4. Testes unitários: **30 aprovados**. Checagem de tipos: **aprovada**. A compilação
   completa local foi iniciada após a atualização, mas ficou excepcionalmente lenta
   nesta máquina; confirmar o deploy `Ready` na Vercel continua obrigatório após o push.

## Leitura executiva

O projeto foi recuperado do GitHub e está publicado na Vercel. A base de fidelidade, os acessos operacionais, a validação de cupom e a preparação da Roleta V2 existem, mas o produto **não deve ser aberto ao público ainda**. A maior razão é que a rota pública `/roleta` continua usando o fluxo legado, que não equivale ao desenho V2 aprovado.

Não houve alteração de dados de clientes nesta auditoria. A única mudança produzida por este ciclo é esta documentação de continuidade.

### Estado por frente

| Frente | Estado | Observação |
| --- | --- | --- |
| Código e GitHub | Verde | `main` no commit `ba1afb2`; cópia completa no GitHub. |
| Vercel | Verde | Último deploy do commit `ba1afb2` foi confirmado como `Ready`. |
| Supabase | Amarelo | Migrações de recuperação, cupom, auditoria e preparação V2 foram aplicadas; precisa de inventário e backup recorrente. |
| Fidelidade e Saipos | Amarelo | Motor de venda é idempotente; falta validação controlada com dados reais e política de retenção. |
| Operação de caixa | Amarelo | Validação atômica de cupons novos existe; o validador legado ainda deve ser descontinuado. |
| Roleta | Vermelho | A página pública ainda usa rotas e regras antigas; V2 está apenas preparada no painel/admin e no banco. |
| WhatsApp/OTP | Amarelo | Arquitetura e limites existem, porém a implementação atual ainda usa Twilio Verify e está desativada. |
| LGPD e documentos legais | Vermelho | Há base técnica parcial, mas faltam política de privacidade, registro de tratamento, atendimento de direitos e retenção. |
| Dependências | Amarelo | Next.js foi atualizado para 16.3.4. Restam 2 alertas altos ligados a `xlsx`/`ws`; a importação deve ser isolada ou substituída antes da abertura pública. |

## O que já foi feito

### Recuperação e infraestrutura

1. Repositório recuperado em `https://github.com/hadukemvv-ux/fidelidade-rei-cupim`.
2. Vercel vinculada ao projeto `fidelidade-rei-cupim`; produção em `clubecupim.com.br`.
3. Projeto Supabase correto: `asjoubgoccbvftyggunz` (`viniciusrochamvrs@hotmail.com's Project`).
4. Projeto Supabase `projeto energia` está explicitamente fora de escopo.
5. Supabase Auth foi configurado com Site URL `https://clubecupim.com.br` e retornos permitidos para produção, desenvolvimento local e previews Vercel.

### Banco e regras de negócio

1. Fundação recuperada em `supabase/migrations/202609010000_schema_base.sql`.
2. RLS foi ativado e privilégios diretos de `anon`/`authenticated` foram removidos das tabelas operacionais conhecidas.
3. Venda Saipos usa registro de pedido processado para idempotência.
4. Resgate de fidelidade é transacional no banco.
5. Pontos, cashback, tickets e níveis são centralizados em `src/lib/fidelidade-rules.ts`.
6. A entrega grátis foi ajustada para intervalo de 14 dias (na prática, até duas utilizações em cerca de um mês).
7. Tabelas de perfis operacionais, cupons, feriados, eventos de cupom, consentimentos e auditoria administrativa foram criadas.
8. O cupom novo é consumido por RPC com bloqueio de linha, evitando uso simultâneo por duas caixas.
9. Foram preparados seis prêmios V2 desativados: frete, sobremesa, saideira, expulsadeira, 10% presencial e 10% delivery.

### Pessoas e permissões

1. Papéis existentes: `superadmin`, `gestor` e `caixa`.
2. Há tela `/admin/operadores` para convite, função, suspensão e exclusão controlada de conta de teste.
3. Exclusão preserva auditoria e não permite apagar a própria conta nem o superadmin.
4. Tela `/admin/auditoria` une eventos de administração e operação de cupons.
5. A tela `/caixa` exige sessão de perfil operacional para consultar e usar cupom novo.

### Segurança já presente

1. PIN é armazenado com derivação forte; hashes legados são migrados após login válido.
2. Sessão de cliente é assinada, HttpOnly e expira em oito horas.
3. OTP tem limites por telefone, IP, intervalo e teto diário, com controle no banco.
4. OTP armazena hashes de telefone e IP, não os valores originais.
5. Rotas administrativas requerem JWT Supabase permitido por allowlist ou metadado administrativo; token legado é apenas fallback.
6. Cron exige `Authorization: Bearer <CRON_SECRET>` e webhook Saipos exige `x-auth-token`.

## Fluxo pretendido e situação real

```text
Venda Saipos -> crédito idempotente -> saldo/nível/tickets
                                  -> resgate clássico (já funciona, mas precisa revisão de cupom)

Comanda/QR do garçom -> sessão de roleta V2 -> telefone + consentimento opcional
                     -> prêmio/cupom V2 -> caixa/gestor valida -> auditoria
                     -> conclusão de cadastro + benefício inicial
```

O primeiro ramo existe em boa parte. O segundo **ainda não está implementado de ponta a ponta**: o QR seguro, a sessão de mesa, o consentimento de marketing, a emissão de cupom V2 e a página pública V2 ainda precisam substituir a Roleta legada.

## Achados da auditoria

### P0 — corrigir antes de abrir ao público

1. **Sorteio semanal legado não é transacional.** `src/app/api/cron/sorteio/route.ts` escolhe com `Math.random`, grava ganhador, conclui sorteio e zera tickets em etapas separadas. Uma falha ou execução paralela pode criar inconsistência. Não habilitar sorteios com prêmio real sem RPC transacional, trava e trilha de auditoria.
2. **Biblioteca `xlsx` possui alertas altos sem correção automática disponível.** Ela é usada em importação. Importações devem ficar restritas a superadmin, com tamanho/formato limitado, sanitização e substituição planejada por biblioteca mantida ou parsing isolado. A auditoria atual também aponta `ws` transitivo; avaliar atualização da cadeia ou remoção da importação.

### P1 — corrigir no próximo ciclo

1. **Dois sistemas de cupom coexistem.** O novo fluxo está em `cupons_promocionais` e `/api/cupons/*`; o legado usa `resgates` e `/api/validar`. O validador legado faz leitura e baixa separadas, sem a mesma atomicidade/auditoria do novo. Definir uma data de migração e retirar o caminho legado da operação.
2. **Administração e permissões não estão unificadas.** A maior parte de `/api/admin/*` aceita admin por allowlist/JWT, enquanto a operação de caixa usa `perfis_operacionais`. É preciso formalizar matriz de permissões por ação: quem cria garçom, altera prêmio, emite cupom, consulta PII, cancela cupom e exporta dados.
3. **Auditoria não cobre todos os efeitos sensíveis.** A nova área de operadores e cupons registra ações, porém mudanças de prêmio, catálogo, garçom, importação, sorteio e execução de cron ainda não têm trilha imutável uniforme.
4. **A função de expirar pontos está propositalmente desativada.** O cron retorna `skipped`; isso é seguro contra perda de pontos, mas as regras comerciais precisam refletir que não existe expiração enquanto não houver ledger por lote.
5. **Backup e restauração não são rotina documentada.** GitHub não é backup de dados. Criar backup periódico do Supabase e testar restauração em ambiente separado.
6. **Saipos precisa de contrato operacional.** Token, origem de pedidos, cancelamentos/reembolsos e campos de telefone devem ser confirmados em documento do fornecedor. Não importar histórico sem identificador idempotente confiável.

### P2 — melhorias importantes

1. A rota pública `/api/resgate/check` revela se um telefone possui cadastro. Reduzir enumeração: resposta neutra ou desafio/OTP antes de detalhar estado.
2. A Roleta legada registra telefone e IP brutos em `garcons_logs`; migrar para hashes com segredo rotacionável e prazo curto de retenção.
3. Há dois arquivos de configuração Next (`next.config.ts` e `next.config.js`). Manter apenas um após validar qual é carregado, evitando comportamento ambíguo.
4. Alguns documentos antigos mencionam 17/21 testes e Twilio como próximo foco. O estado atual tem 30 testes unitários, V2 em preparação e decisão pendente sobre provedor oficial de WhatsApp. A documentação precisa ser consolidada.
5. Logs de API ainda podem levar contexto sensível a logs da Vercel. Adotar catálogo de campos permitidos e nunca registrar telefone, e-mail, CPF, PIN, token, cupom completo ou payload bruto Saipos.
6. Falta proteção de borda contra abuso distribuído (Turnstile/WAF/rate limit distribuído) para cadastro, PIN, roleta e OTP.

## LGPD — avaliação prática, não parecer jurídico

O sistema trata dados pessoais: nome, telefone, e-mail, aniversário, histórico de compras, saldo, perfil de consumo, logs operacionais e, em alguns fluxos, CPF. Portanto, deve entrar em operação somente com processo de privacidade definido pelo negócio.

### O que está bem encaminhado

- O consentimento de aniversário existe e não é obrigatório.
- A tabela de consentimentos de marketing permite registrar finalidade, versão de texto, origem e data.
- OTP usa hashes para telefone/IP.
- Acesso operacional pode ser individualizado e auditado.

### O que falta antes de campanha e marketing

1. Política de privacidade pública, com controlador, contato, finalidades, compartilhamentos (Supabase, Vercel, Saipos, futuro WhatsApp), retenção e direitos do titular.
2. Texto de consentimento de marketing **separado**, opcional, sem caixa pré-marcada e com versão persistida. Não confundir com cadastro, aniversário ou aceite de termos.
3. Tela/processo para revogar marketing por canal e registrar a revogação; a revogação deve ser respeitada antes de qualquer envio.
4. Processo de acesso, correção, exportação e exclusão/anônimização solicitados pelo titular. Exclusão de login de funcionário não é exclusão de dados de cliente.
5. Política de retenção: sugerido definir prazos para logs de IP, tentativas de OTP, sessões, cupons, auditoria e dados fiscais/contábeis conforme orientação jurídica/contábil.
6. Inventário de operadores e contratos com fornecedores; limitar acessos por necessidade e revisar trimestralmente.
7. Revisão jurídica específica para campanha promocional baseada em sorte/roleta, prêmios e comunicação comercial. A habilitação de distribuição aleatória de prêmios deve depender da análise aplicável.

## Roteiro recomendado de execução

### Fase A — bloqueio de risco (primeira prioridade)

1. Atualizar Next.js para versão corrigida e revisar auditoria de dependências.
2. Desativar ou esconder a Roleta legada em produção até a V2 estar pronta.
3. Decidir formalmente se sorteios legados continuarão; se sim, reescrever com transação/lock/auditoria e aleatoriedade segura.
4. Remover o validador de cupom legado do fluxo operacional assim que o novo for suficiente.

**Saída da fase:** build, TypeScript, testes e deploy aprovados; nenhuma rota pública distribui prêmio fora da política atual.

### Fase B — Roleta V2 segura

1. Criar sessão de comanda/mesa assinada, curta e de uso único, gerada pelo garçom autorizado.
2. QR deve carregar somente identificador opaco; valor, nível e prêmio elegível ficam no servidor.
3. Implementar cinco níveis definidos por regras comerciais aprovadas e armazenar o snapshot da compra/sessão.
4. Tela cliente: telefone, aviso de privacidade, opt-in opcional de marketing e uma única escolha clara de jogo.
5. Gerar cupom V2 com código aleatório forte, hash no banco, validade de 14 dias, dias úteis e feriados configuráveis.
6. Liberar somente validação autenticada por `caixa`, `gestor` ou `superadmin`; registrar consulta, recusa e uso.
7. Só então ativar prêmios V2 no painel. Fazer piloto com cupons `modo_teste=false` apenas após a autorização comercial/jurídica.

### Fase C — WhatsApp oficial

1. Comprar chip dedicado e cadastrar número comercial.
2. Escolher provedor oficial: Meta WhatsApp Cloud API diretamente ou BSP autorizado. Não automatizar conta pessoal nem criar cópia informal de Twilio.
3. Configurar templates, webhooks, opt-in, opt-out e limites de custo.
4. Substituir/abstrair `src/lib/whatsappOtp.ts`; manter o mesmo contrato de limite/grant.
5. Fazer beta com os próprios números e confirmar entrega, expiração e custo.

### Fase D — operação e LGPD

1. Publicar política de privacidade e texto de marketing aprovados.
2. Implementar preferências e revogação de marketing.
3. Criar painel de auditoria completo e exportação por titular.
4. Criar rotina de backup, recuperação e revisão de acesso.
5. Treinar caixas e gestores com roteiro curto de validação e fraude.

## Como retomar depois de trocar de computador

### Fontes de verdade

| Item | Onde está |
| --- | --- |
| Código e histórico | GitHub `hadukemvv-ux/fidelidade-rei-cupim`, branch `main` |
| Produção | Vercel, projeto `fidelidade-rei-cupim` |
| Banco/Auth | Supabase ref `asjoubgoccbvftyggunz` |
| Domínio | `clubecupim.com.br` |
| Estado de produto | Este arquivo e `docs/ROADMAP.md` |
| Regras de pontos | `docs/REGRAS-FIDELIDADE.md` e `src/lib/fidelidade-rules.ts` |
| Esquema de banco | `supabase/migrations/` |

### Procedimento seguro

1. Instalar Git e Node LTS em computador novo.
2. Clonar o repositório do GitHub; nunca recuperar de cópia avulsa ou ZIP antigo.
3. Criar `.env.local` a partir de `.env.example` usando valores de Vercel/Supabase. Não enviar segredos em chat, Git ou planilha.
4. Executar `npm install`, `npm run test:unit`, `npx tsc --noEmit` e `npm run build`.
5. Conferir `git status` e o commit atual antes de qualquer alteração.
6. Conferir no Supabase qual migração já foi aplicada antes de executar qualquer SQL. Migrações antigas devem ser idempotentes; nunca rodar comandos de limpeza sem backup.
7. Fazer mudanças pequenas, testar, commitar, subir para `main` e confirmar o deploy Ready na Vercel.
8. Atualizar este arquivo e `docs/ROADMAP.md` ao concluir cada fase.

### Nunca fazer

- Não usar `git reset --hard` nem apagar tabelas para “recomeçar”.
- Não expor Service Role, token Saipos, segredo de cron, tokens de admin ou credenciais de WhatsApp.
- Não alterar `projeto energia` ao trabalhar no Clube Cupim.
- Não ativar a Roleta V2 ou fazer campanha real antes da Fase A/B e revisão de conformidade.

## Checklist antes do primeiro cliente real

- [ ] Dependências sem alertas críticos/altos conhecidos.
- [ ] Roleta legada bloqueada ou substituída pela V2.
- [ ] Fluxo completo testado: QR -> telefone -> consentimento -> cupom -> caixa -> auditoria.
- [ ] Pelo menos dois usuários de caixa e um gestor cadastrados com e-mails reais.
- [ ] Teste de exclusão de usuário de teste, sem apagar dados de clientes.
- [ ] Política de privacidade e consentimento de marketing publicados.
- [ ] Processo de opt-out validado.
- [ ] Backup do Supabase criado e restauração testada fora de produção.
- [ ] Token Saipos rotacionado e webhook validado.
- [ ] Provedor WhatsApp oficial configurado e beta concluído.
- [ ] Alertas de falha de cron e log operacional revisados.

## Evidências técnicas deste ciclo

- Teste unitário anterior: 30 testes aprovados.
- Checagem de tipos anterior: sem erro.
- Último deploy observado: commit `ba1afb2`, status Ready.
- Auditoria de dependências: 7 vulnerabilidades em produção (1 crítica, 5 altas, 1 moderada); a maior concentração está em Next.js `16.1.2`.
- A sessão do painel Supabase expirou durante esta auditoria; não foi feita nenhuma alteração adicional em ambiente externo.
