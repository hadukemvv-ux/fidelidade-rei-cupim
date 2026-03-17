# 📚 Arquitetura do Sistema de Fidelidade

## Visão Geral

Sistema de programa de fidelidade escalável para churrascarias e restaurantes, com suporte a múltiplos estabelecimentos (multi-tenant ready).

**Stack tecnológico:**
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL)
- Language: TypeScript
- Validation: Zod
- Auth: JWT + Token-based

---

## 🏗️ Estrutura de Diretórios

```
src/
├── app/
│   ├── api/
│   │   ├── _utils/           # Utilitários compartilhados
│   │   │   ├── validateAdminAuth.ts
│   │   │   └── validarToken.ts
│   │   ├── admin/            # Endpoints administrativos (protegidos)
│   │   ├── cron/             # Jobs automatizados (protegidos)
│   │   ├── financeiro/       # Dashboard financeiro (protegido)
│   │   ├── consultar/        # Consulta cliente (público)
│   │   ├── resgate/          # Sistema de resgate
│   │   ├── webhooks/         # Integrações externas
│   │   └── ...
│   ├── admin/                # Páginas de admin
│   ├── login/                # Login
│   ├── cadastro/             # Cadastro cliente
│   ├── roleta/               # Roleta de pontos
│   ├── resgate/              # UI resgate
│   └── layout.tsx
├── lib/
│   ├── fidelidade-rules.ts   # Lógica de negócio centralizada
│   ├── supabaseAdmin.ts      # Cliente Supabase
│   ├── api-utils.ts          # Utilitários de API & logging
│   └── validations.ts        # Schemas Zod
├── types/
│   └── index.ts              # Type definitions
└── components/
    └── ...
```

---

## 🔐 Segurança & Autenticação

### Autenticação de Rotas

**Admin Routes** (`/api/admin/*`)
```
Requer: Authorization: Bearer {ADMIN_SECRET_TOKEN}
           ou ?token={ADMIN_SECRET_TOKEN}
Exemplos protegidos:
  - POST /api/admin/dashboard - dashboard KPIs
  - POST /api/admin/garcons/reset - reset leaderboard
  - POST /api/admin/sorteio/rodar - executar sorteio
```

**Cron Routes** (`/api/cron/*`)
```
Requer: Authorization: Bearer {CRON_SECRET}
           ou ?token={CRON_SECRET}
Exemplos:
  - GET /api/cron/saipos - importar vendas
  - GET /api/cron/expirar-pontos - penalizar inativos
```

**Endpoints Públicos**
```
Sem autenticação necessária:
  - GET /api/consultar?telefone={} - consultar cliente
  - POST /api/resgate - resgatar pontos
  - POST /api/cadastro - registrar cliente
  - POST /api/webhooks/saipos - receber vendas
```

---

## 💼 Lógica de Negócio

### Modelo de Níveis & Pontos

Centralizado em `src/lib/fidelidade-rules.ts`:

```typescript
BRONZE: R$ 0-99       → 4 pontos/R$,  0.25% cashback, 1 ticket/50R$
PRATA:  R$ 100-299    → 7 pontos/R$,  1% cashback,    2 tickets/50R$
OURO:   R$ 300-599    → 10 pontos/R$, 2% cashback,    3 tickets/50R$
REI:    R$ 600+       → 14 pontos/R$, 3% cashback,    4 tickets/50R$
```

**Funções principais:**
- `getNivelPorGasto(gastoTotal)` - Retorna nível baseado em R$ gasto
- `calcularPontosEarned()` - Pontos ganhados na compra
- `calcularCashbackValue()` - Cashback em R$
- `calcularTicketsEarned()` - Tickets para sorteio

### Fluxos Principais

#### 1️⃣ Venda → Pontos

```
Webhook/Cron Saipos
  ↓
processarVenda() [motor único]
  ├─ Buscar/Criar cliente
  ├─ Calcular pontos (fidelidade-rules)
  ├─ Atualizar cliente (nivel, pontos, cashback, tickets)
  └─ Registrar em extrato_pontos
```

#### 2️⃣ Consulta Cliente

```
GET /api/consultar?telefone={}
  ├─ Validar telefone
  ├─ Buscar cliente base_clientes_saipos
  ├─ Calcular progresso
  └─ Retornar nível, pontos, progresso até próximo nível
```

#### 3️⃣ Resgate Pontos

```
POST /api/resgate
  ├─ Validar cliente + PIN
  ├─ Buscar saldo (pontos/cashback/tickets)
  ├─ Debitarem
  └─ Criar registro em resgates
```

#### 4️⃣ Sorteio

```
POST /api/admin/sorteio/rodar
  ├─ Buscar sorteio ativo
  ├─ Agrupar clientes por tickets
  ├─ Fisher-Yates shuffle
  ├─ Selecionar ganhador
  ├─ Zerar tickets
  └─ Registrar em sorteios_ganhadores
```

#### 5️⃣ Expiração (Inatividade)

```
GET /api/cron/expirar-pontos?token={}
  ├─ Buscar clientes com última compra > 30 dias
  ├─ Se 30-59 dias: reduz 30%, rebaixa nível
  ├─ Se 60+ dias: zera tudo
  └─ Registrar em extrato_pontos
```

---

## 📊 Schema de Dados

### Tabelas Principais

```sql
-- Clientes
base_clientes_saipos
  id, telefone, nome, email, cpf,
  nivel, pontos, cashback, tickets,
  total_gasto, qtd_pedidos,
  primeira_compra, ultima_compra,
  pin_hash, bloqueado

-- Histórico de transações
extrato_pontos
  id, cliente_id, tipo (entrada/saida),
  pontos, cashback, descricao, criado_em

-- Vendas processadas
saipos_pedidos_processados
  id_sale, cliente_id, valor,
  pontos_ganhos, cashback_ganho, criado_em

-- Resgates
resgates
  id, cliente_id, tipo, valor, status, criado_em

-- Sorteios
sorteios
  id, titulo, status, data_inicio, data_fim, tipo_premio

-- Ganhadores sorteio
sorteios_ganhadores
  id, sorteio_id, cliente_id, nome_cliente,
  telefone_cliente, tickets_no_sorteio, criado_em

-- Logs de cron
saipos_cron_logs
  tipo, mensagem, id_cliente, id_sale, valor, criado_em
```

---

## 🚀 Escalabilidade & Multi-tenant

### Preparação para Multi-tenant

**Estrutura futura** (já considerada no design):

1. **Coluna `estabelecimento_id`** em todas as tabelas
2. **Row-Level Security (RLS)** em Supabase para isolamento
3. **API Gateway** para roteamento por tenant
4. **Configuração por tenant** (règras de pontos, sorteios)

**Migrações necessárias:**
```sql
ALTER TABLE base_clientes_saipos ADD estabelecimento_id INT;
ALTER TABLE sorteios ADD estabelecimento_id INT;
ALTER TABLE resgates ADD estabelecimento_id INT;
-- ... (todas as tabelas)

CREATE POLICY "tenant_isolation" ON base_clientes_saipos
  USING (estabelecimento_id = current_setting('app.current_tenant')::int);
```

---

## 📈 Performance

### Otimizações Implementadas

1. **Queries Seletivas**: Não usar `SELECT *`
   ```typescript
   // ❌ Ruim
   .select('*')
   
   // ✅ Bom
   .select('id, name, email, nivel, pontos')
   ```

2. **Índices de Banco**:
   ```sql
   CREATE INDEX idx_cliente_telefone ON base_clientes_saipos(telefone);
   CREATE INDEX idx_cliente_nivel ON base_clientes_saipos(nivel);
   CREATE INDEX idx_pedido_cliente ON saipos_pedidos_processados(cliente_id);
   CREATE INDEX idx_resgate_cliente ON resgates(cliente_id);
   ```

3. **Caching de Regras**:
   - Fidelidade rules carregadas em memória (não query)
   - Cálculos determinísticos sem I/O

4. **Rate Limiting**:
   - Endpoints públicos: 100 req/min por IP
   - Endpoints admin: 1000 req/min por token

---

## 🔌 Integrações Externas

### Saipos

**Webhook** (Real-time)
```
POST /api/webhooks/saipos
  Header: x-auth-token: {SAIPOS_TOKEN}
  Body: { customer_phone, order_total, order_id, ... }
```

**Cron** (Histórico)
```
GET /api/cron/saipos?token={CRON_SECRET}
  Puxa vendas últimas 24h via API Saipos
  Processa batch
```

---

## 🎯 API Versioning

**Estratégia**: URL-based versioning (futura)

```
/api/v1/consultar
/api/v2/consultar
```

**Changelog será mantido** em `CHANGELOG.md`

---

## 🧪 Testing Strategy

### Unit Tests
```
lib/fidelidade-rules.test.ts
lib/validations.test.ts
```

### Integration Tests
```
api/consultar.test.ts
api/admin/dashboard.test.ts
```

### Load Tests (para 6000 clientes)
```
k6 load-test.js
  - Concurrent consultars
  - Batch vendas import
  - Simultaneous resgates
```

---

## 📝 Deployment Checklist

- [ ] Variáveis `.env` configuradas (Vercel dashboard)
- [ ] Database migrations rodadas
- [ ] Cron jobs configuradas em Vercel Cron
- [ ] Rate limiting ativado
- [ ] Monitoring/alertas configurados
- [ ] Backup strategy definida
- [ ] SSL/HTTPS validado
- [ ] CORS configurado
- [ ] Logs centralizados (Sentry/LogRocket)

---

## 📦 Como Vender / Expandir

### 1. Whitelabel

```typescript
// Customization points:
configuracao = {
  logo_url,
  nome_estabelecimento,
  email_suporte,
  regras_pontos: { // Override default rules
    bronze: { pontos: 3, cashback: 0.01 },
    ...
  }
}
```

### 2. Add-ons

- SMS notifications
- QR-code based check-ins
- Birthday bonuses
- Seasonal campaigns
- Integração com múltiplos PDVs

### 3. Pricing Model

```
Plan Básico: R$ 299/mês
  - até 2000 clientes
  - 1 sorteio/mês

Plan Pro: R$ 799/mês
  - até 10k clientes
  - sorteios ilimitados
  - analytics avançado

Plan Enterprise: Custom
  - multi-tenant
  - API ilimitada
  - suporte prioritário
```

---

## 📞 Support & Maintenance

- Bug fixes: 24h SLA
- Feature requests: Backlog prioritizado
- Security patches: Immediate
- Database backups: Diário

---

**Última atualização**: 17/03/2026
**Versão architetura**: 1.0 (Production-ready)
