# Guia de Operacao e Testes

Este documento e para rodar validacoes tecnicas no dia a dia.

## Variaveis recomendadas para testes

- `CRON_SECRET`
- `SAIPOS_TOKEN`
- `ADMIN_TEST_EMAIL`
- `ADMIN_TEST_PASSWORD`
- `WHATSAPP_OTP_ENABLED` (manter `false` até o remetente estar pronto)
- `WHATSAPP_OTP_BETA_ONLY`
- `WHATSAPP_OTP_BETA_PHONES`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `OTP_MAX_GLOBAL_DAY`

Fallback temporario:
- `ADMIN_SECRET_TOKEN`

## 1. Check de saude rapido

```powershell
npm run build
node tests/saipos-integration.js
```

## 2. Testes por categoria

### 2.1 Concordancia de regras

Objetivo: garantir que calculos de pontos/nivel batem com as regras.

Arquivo base:
- `src/lib/fidelidade-rules.ts`

Teste pratico:
- Processar venda de R$80
- Processar venda de R$250 no mesmo cliente
- Confirmar nivel final OURO em `api/consultar`

### 2.2 Fluxo principal (flow)

Fluxo esperado:
1. Venda chega via webhook/cron SAIPOS
2. `processarVenda` calcula ganhos
3. Cliente e atualizado no Supabase
4. Consulta retorna saldos e nivel corretos

Ferramenta:
- `node tests/saipos-integration.js`

### 2.3 Seguranca

Cobertura minima:
- Admin sem token -> 401
- Admin token errado -> 403
- Admin por query token legado -> 401
- Cron sem token -> 401
- Webhook sem token -> 401

### 2.4 Crons

Endpoints:
- `/api/cron/saipos`
- `/api/cron/saipos/historico?dias=1`
- `/api/cron/expirar-pontos`
- `/api/cron/sorteio`

Comportamento esperado:
- Sem token: 401
- Com token correto: nao retornar 401/403
- Crons SAIPOS podem demorar mais (dependem da API externa)

### 2.5 WhatsApp OTP (beta)

Antes do primeiro envio real:

1. Confirmar que o remetente WhatsApp está aprovado na Twilio/Meta.
2. Manter `WHATSAPP_OTP_BETA_ONLY=true`.
3. Preencher `WHATSAPP_OTP_BETA_PHONES` apenas com os convidados.
4. Começar com `OTP_MAX_GLOBAL_DAY=30`.
5. Só então alterar `WHATSAPP_OTP_ENABLED=true`.

Fluxos que consomem OTP:

- primeiro cadastro;
- conclusão de pré-cadastro da roleta;
- recuperação de PIN.

O login normal por telefone e PIN não envia mensagem e não gera custo de OTP.

## 3. Comandos uteis

### Rodar servidor

```powershell
npm run dev
```

### Teste cron manual

```powershell
# Exemplo com token no header
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/saipos
```

### Teste webhook manual

```powershell
curl -X POST http://localhost:3000/api/webhooks/saipos \
  -H "x-auth-token: <SAIPOS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"id_sale":123456,"customer_phone":"11999990000","order_total":80}'
```

## 4. Interpretacao de falhas

- `401`: faltou autenticacao
- `403`: token incorreto
- `500` com SAIPOS: checar token SAIPOS e payload recebido
- Timeout em cron SAIPOS: aumento de volume ou lentidao externa

## 5. Checklist antes de deploy

- [ ] `npm run build` ok
- [ ] `node tests/saipos-integration.js` ok
- [ ] variaveis de ambiente revisadas
- [ ] `ADMIN_ALLOWED_EMAILS` revisado para os admins reais
- [ ] cron schedule revisado em `vercel.json`
- [ ] sem segredos no git
