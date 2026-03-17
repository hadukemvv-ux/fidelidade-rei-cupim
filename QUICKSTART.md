# 🚀 Quick Start Guide - Programa de Fidelidade

**Tempo de setup**: 10 minutos  
**Skill necessário**: Node.js basics, TypeScript basics  
**Last Updated**: 17/03/2026

---

## 1️⃣ Clone & Install (2 min)

```bash
git clone <repo-url>
cd fidelidade
npm install
```

---

## 2️⃣ Setup Environment (3 min)

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local com seus valores:
# - NEXT_PUBLIC_SUPABASE_URL (get from Supabase dashboard)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - SAIPOS_TOKEN (from Saipos)

# Generate tokens (run twice)
openssl rand -base64 32  # → ADMIN_SECRET_TOKEN
openssl rand -base64 32  # → CRON_SECRET
```

---

## 3️⃣ Start Dev Server (2 min)

```bash
npm run dev
```

Visit http://localhost:3000

---

## 4️⃣ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home (login redirects to /login)
│   ├── layout.tsx
│   ├── api/               # 🔑 ALL API ENDPOINTS HERE
│   │   ├── consultar/     # GET /api/consultar?telefone=11987...
│   │   ├── resgate/       # POST /api/resgate
│   │   ├── webhooks/      # Webhook receivers (Saipos)
│   │   ├── cron/          # Scheduled jobs
│   │   ├── admin/         # 🔒 Protected routes (need ADMIN_SECRET_TOKEN)
│   │   └── _utils/        # validateAdminAuth, validarToken
│   ├── login/page.tsx
│   └── admin/             # Admin dashboard pages
├── lib/
│   ├── fidelidade-rules.ts    # 📖 BUSINESS LOGIC (single source of truth)
│   ├── api-utils.ts           # Error handling + logging
│   ├── validations.ts         # Zod schemas
│   └── supabaseAdmin.ts       # DB connection
├── types/
│   └── index.ts         # Global TypeScript interfaces
└── components/
    └── (UI components)
```

---

## 🔑 Core Concepts

### 1. Business Rules
All loyalty calculations in **one file**:

```typescript
// src/lib/fidelidade-rules.ts
import { getNivelPorGasto, calcularPontosEarned } from '@/lib/fidelidade-rules'

const nivel = getNivelPorGasto(1500) // → 'OURO'
const pontos = calcularPontosEarned(100, 1500) // valor, gasto_total
```

### 2. Input Validation
Every field validated with Zod:

```typescript
// src/lib/validations.ts
import { validarDados, ClienteSchema } from '@/lib/validations'

const { ok, data, error } = validarDados(ClienteSchema, inputData)
if (!ok) return errorResponse(error, 'validation_error')
```

### 3. Error Handling
Consistent error responses everywhere:

```typescript
// src/lib/api-utils.ts
import { successResponse, errorResponse } from '@/lib/api-utils'

try {
  const data = await db.query()
  return successResponse(data)
} catch (e) {
  return errorResponse(e.message, 'server_error')
}
```

### 4. Request Tracking
Every request has unique ID for debugging:

```typescript
import { getRequestId } from '@/lib/api-utils'

const requestId = getRequestId(request)
logInfo({ requestId, endpoint: '/api/consultar', message: 'Success' })
```

---

## 📝 Common Tasks

### Test an endpoint locally

```bash
# Consultar cliente
curl 'http://localhost:3000/api/consultar?telefone=11987654321'

# Response:
# { "ok": true, "data": { "cliente": {...}, "pontos": 150, ... } }
```

### Add validation to new endpoint

```typescript
import { validarDados, ResgateSchema } from '@/lib/validations'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(request: Request) {
  const body = await request.json()
  const { ok, data, error } = validarDados(ResgateSchema, body)
  
  if (!ok) return errorResponse(error, 'validation_error')
  // ... rest of logic
}
```

### Protect admin route

```typescript
import { validateAdminAuth } from '@/lib/_utils/validateAdminAuth'

export async function POST(request: Request) {
  // 1. Check admin token first
  const authError = validateAdminAuth(request)
  if (authError) return authError
  
  // 2. Then do your logic
  // ...
}
```

### Log an event

```typescript
import { logInfo, logError } from '@/lib/api-utils'

logInfo({
  endpoint: '/api/consultar',
  message: 'Cliente found',
  clienteId: 123
})

logError({
  endpoint: '/api/resgate',
  message: 'Insufficient points',
  requestId: 'uuid-xxx'
})
```

---

## 🐛 Debugging

### Build fails

```bash
npm run build          # See full errors
npm run lint          # See lint issues
```

### Env vars not working

```bash
# Make sure you created .env.local (not .env)
ls -la .env.local

# Restart dev server after changing
# Ctrl+C then npm run dev
```

### Database connection fails

```bash
# Check Supabase keys in .env.local
# Test connection in src/lib/supabaseAdmin.ts

const { data, error } = await supabase
  .from('base_clientes_saipos')
  .select('count(*)')
```

### Webhook not working

```bash
# Check SAIPOS_TOKEN in .env.local
# Test with curl:
curl -X POST http://localhost:3000/api/webhooks/saipos \
  -H "x-auth-token: $SAIPOS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_phone":"11987654321","order_total":150}'
```

---

## 📚 Documentation Files

| File | For |
|------|-----|
| [ARQUITETURA.md](./ARQUITETURA.md) | System design, future multi-tenant, scaling |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment, Vercel setup, cron jobs |
| [IMPLEMENTACOES.md](./IMPLEMENTACOES.md) | What was fixed, what's TODO |
| [STATUS_ALPHA.md](./STATUS_ALPHA.md) | Current progress, alpha checklist |

---

## 🔒 Security Things to Know

1. **Admin routes**: Require `ADMIN_SECRET_TOKEN` header
   ```bash
   Authorization: Bearer {ADMIN_SECRET_TOKEN}
   ```

2. **Webhooks**: Check `x-auth-token` header
3. **Cron jobs**: Require `CRON_SECRET` (only Vercel can call automatically)
4. **Never commit**: `.env.local` is in `.gitignore` ✅
5. **Never log**: Passwords, tokens, sensitive data

---

## ✅ Checklist Before Committing

```bash
# 1. Check build
npm run build

# 2. Check linting
npm run lint

# 3. Test your endpoint
curl http://localhost:3000/api/your-endpoint

# 4. Check types
npm run type-check

# 5. Commit
git add .
git commit -m "feat: your feature"
git push
```

---

## 🚀 Deploy to Production

Full guide in [DEPLOYMENT.md](./DEPLOYMENT.md), but TL;DR:

```bash
# 1. Push to main branch
git push origin main

# 2. Vercel auto-deploys
# 3. Add env vars in Vercel Dashboard
# 4. Done! 🎉
```

---

## ❓ Need Help?

- **API Design**: Check `src/app/api/consultar/route.ts` (best example)
- **Validation**: Check `src/lib/validations.ts`
- **Error Handling**: Check `src/lib/api-utils.ts`
- **Business Logic**: Check `src/lib/fidelidade-rules.ts`
- **Types**: Check `src/types/index.ts`

---

## 🎯 Next Steps

1. Read [ARQUITETURA.md](./ARQUITETURA.md) (20 min)
2. Try running locally `npm run dev`
3. Test an endpoint with curl
4. Pick a TODO endpoint and add validation (using consultar as template)
5. Submit PR

---

**Happy coding! 🚀**

Questions? Check STATUS_ALPHA.md or IMPLEMENTACOES.md

Last updated: 17/03/2026
