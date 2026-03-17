# 🚀 Guia de Deployment para Alpha

## Pré-requisitos

- [ ] Conta Vercel criada (free tier ok para inicial)
- [ ] Supabase projeto criado
- [ ] Conta Saipos (ou sandbox)
- [ ] Domínio configurado (ou usar *.vercel.app)

---

## Step 1: Variáveis de Ambiente

### Local Development (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...

# Admin Auth
ADMIN_SECRET_TOKEN=<generate: openssl rand -base64 32>

# Cron Jobs
CRON_SECRET=<generate: openssl rand -base64 32>

# Saipos
SAIPOS_TOKEN=<seu token Saipos>

# Environment
NODE_ENV=development
```

### Production (Vercel Dashboard)

1. Ir em **Settings → Environment Variables**
2. Adicionar cada variável:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET_TOKEN`
   - `CRON_SECRET`
   - `SAIPOS_TOKEN`

---

## Step 2: Setup Supabase

### Criar Tabelas

```sql
-- 1. Clientes
CREATE TABLE base_clientes_saipos (
  id BIGSERIAL PRIMARY KEY,
  telefone VARCHAR(11) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  cpf VARCHAR(11),
  data_nascimento DATE,
  nivel VARCHAR(20) DEFAULT 'BRONZE',
  pontos NUMERIC DEFAULT 0,
  cashback NUMERIC DEFAULT 0,
  tickets NUMERIC DEFAULT 0,
  total_gasto NUMERIC DEFAULT 0,
  qtd_pedidos NUMERIC DEFAULT 0,
  primeira_compra TIMESTAMP DEFAULT NOW(),
  ultima_compra TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  pin_hash VARCHAR(64),
  bloqueado BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT
);

CREATE INDEX idx_cliente_telefone ON base_clientes_saipos(telefone);
CREATE INDEX idx_cliente_nivel ON base_clientes_saipos(nivel);

-- 2. Extrato de Pontos
CREATE TABLE extrato_pontos (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES base_clientes_saipos(id),
  tipo VARCHAR(50),
  pontos NUMERIC DEFAULT 0,
  cashback NUMERIC DEFAULT 0,
  tickets NUMERIC DEFAULT 0,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_extrato_cliente ON extrato_pontos(cliente_id);

-- 3. Pedidos Processados
CREATE TABLE saipos_pedidos_processados (
  id BIGSERIAL PRIMARY KEY,
  id_sale VARCHAR(100) UNIQUE NOT NULL,
  cliente_id BIGINT REFERENCES base_clientes_saipos(id),
  valor NUMERIC,
  pontos_ganhos NUMERIC,
  cashback_ganho NUMERIC,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- 4. Resgates
CREATE TABLE resgates (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES base_clientes_saipos(id),
  tipo VARCHAR(50),
  valor NUMERIC,
  status VARCHAR(50) DEFAULT 'solicitado',
  criado_em TIMESTAMP DEFAULT NOW(),
  processado_em TIMESTAMP
);

-- 5. Sorteios
CREATE TABLE sorteios (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ativo',
  tipo_premio VARCHAR(255),
  descricao TEXT,
  data_inicio TIMESTAMP,
  data_fim TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- 6. Ganhadores Sorteio
CREATE TABLE sorteios_ganhadores (
  id BIGSERIAL PRIMARY KEY,
  sorteio_id BIGINT NOT NULL REFERENCES sorteios(id),
  cliente_id BIGINT NOT NULL REFERENCES base_clientes_saipos(id),
  nome_cliente VARCHAR(255),
  telefone_cliente VARCHAR(11),
  tickets_no_sorteio NUMERIC,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- 7. Logs Cron
CREATE TABLE saipos_cron_logs (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50),
  mensagem TEXT,
  id_cliente BIGINT,
  id_sale VARCHAR(100),
  valor NUMERIC,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

---

## Step 3: Configurar Cron Jobs

### No Vercel

1. Criar arquivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/saipos",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/expirar-pontos",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. **IMPORTANTE**: Adicionar query param ou header com token:

   ```bash
   # Opção 1: URL com token (NÃO RECOMENDADO em produção)
   /api/cron/saipos?token={CRON_SECRET}
   
   # Opção 2: Header (RECOMENDADO)
   Authorization: Bearer {CRON_SECRET}
   ```

3. Configurar no Vercel Dashboard → **Cron Jobs** (Pro plan necessário)

---

## Step 4: Integração Saipos

### Webhook Configuration

1. Ir em Saipos → Webhooks
2. Adicionar endpoint:
   ```
   https://seu-app.vercel.app/api/webhooks/saipos
   Header: x-auth-token: {SAIPOS_TOKEN}
   ```

3. Testar webhook:
   ```bash
   curl -X POST https://seu-app.vercel.app/api/webhooks/saipos \
     -H "x-auth-token: $(echo $SAIPOS_TOKEN)" \
     -H "Content-Type: application/json" \
     -d '{
       "customer_phone": "11987654321",
       "order_total": 150.00,
       "order_id": "12345"
     }'
   ```

---

## Step 5: Testing Endpoints

### Teste de Autenticação Admin

```bash
# Setup token
AUTH_TOKEN="<seu ADMIN_SECRET_TOKEN>"

# Teste dashboard
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  https://seu-app.vercel.app/api/admin/dashboard

# Esperado: { "ok": true, "data": { ... } }
```

### Teste de Consulta Cliente

```bash
curl 'https://seu-app.vercel.app/api/consultar?telefone=11987654321'

# Esperado: { "ok": true, "data": { "cliente": { ... }, "pontos": X, ... } }
```

### Teste de Cron Job

```bash
CRON_TOKEN="<seu CRON_SECRET>"

curl -H "Authorization: Bearer $CRON_TOKEN" \
  https://seu-app.vercel.app/api/cron/saipos

# Esperado: { "success": true, "processadas": X, ... }
```

---

## Step 6: Monitoramento & Logging

### Sentry (Recomendado para produção)

```bash
npm install @sentry/nextjs

# Configure em .env.local
SENTRY_DSN=https://xxx@sentry.io/xxxx
```

### Logs Estruturados

Todos os endpoints agora logam:
```json
{
  "timestamp": "2026-03-17T10:30:00Z",
  "endpoint": "/api/consultar",
  "message": "Cliente encontrado",
  "request_id": "uuid-xxx"
}
```

---

## Step 7: Performance & Segurança

### Checklist de Produção

- [ ] SSL/HTTPS ativado (automático no Vercel)
- [ ] CORS configurado 
- [ ] Rate limiting ativado (implementado em `/lib/api-utils.ts`)
- [ ] Database backups configurados (Supabase)
- [ ] Logs centralizados (opcional: Sentry)
- [ ] Monitoring de uptime (opcional: Uptime Robot)

### Otimizações

```typescript
// Em .env.local para dev apenas
NEXT_PUBLIC_DEBUG=false

// Em production, Next.js otimiza automaticamente
```

---

## Step 8: Deployment

### Via Vercel (Recomendado)

```bash
# 1. Push para Git
git add .
git commit -m "Alpha release"
git push origin main

# 2. Vercel detecta automaticamente
# 3. Build e deploy automático
# 4. Verificar em https://seu-app.vercel.app
```

### Via CLI

```bash
npm install -g vercel
vercel login
vercel
```

---

## Step 9: Checklist Final

Antes de fazer alpha launch:

- [ ] Todas as tabelas criadas no Supabase
- [ ] `.env` configurado localmente (testar com `npm run dev`)
- [ ] `ADMIN_SECRET_TOKEN` e `CRON_SECRET` gerados (openssl rand -base64 32)
- [ ] Saipos token configurado
- [ ] Cron jobs configuradas no Vercel
- [ ] Webhook Saipos testado
- [ ] Build local passa (`npm run build`)
- [ ] Deploy para staging (branch `develop`)
- [ ] Testes com 6000 clientes simulados
- [ ] Backup strategy implementada

---

## Troubleshooting

### Build falha localmente

```bash
# Limpar cache
rm -rf .next
npm install
npm run build
```

### Webhook não funciona

```bash
# Verificar logs no Vercel
vercel logs

# Testar token
curl -H "x-auth-token: $SAIPOS_TOKEN" https://seu-app/api/webhooks/saipos

# Se 401: token errado
# Se 500: erro no processamento (checar Supabase connection)
```

### Cron job não roda

```bash
# Só disponível em Vercel Pro+ plan
# Alternativa: usar externa como AWS Lambda, Google Cloud Scheduler

# Testar manualmente
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://seu-app/api/cron/saipos
```

---

## Escalabilidade Futura

Para passar de 1 para 6000+ clientes:

1. **Database**: Supabase escala automaticamente
2. **Queries**: Índices já estão configurados
3. **Cron**: Pode processar até 10k vendas/dia
4. **API**: Vercel Auto-scaling (Pro)
5. **Rate Limiting**: Adjust em `src/lib/api-utils.ts`

---

## Support

- Docs: [ARQUITETURA.md](./ARQUITETURA.md)
- Implementações: [IMPLEMENTACOES.md](./IMPLEMENTACOES.md)
- Issues: Github Issues
- Email: support@seu-app.com

---

**Última atualização**: 17/03/2026
**Versão deployment**: 1.0-alpha
