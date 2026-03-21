# Guia Iniciante (Passo a Passo)

Este guia foi feito para quem esta comecando e quer rodar o projeto sem se perder.

## 1. O que este projeto faz

Sistema de fidelidade com:
- Cadastro e consulta de clientes
- Pontos, cashback e tickets por compra
- Integracao com SAIPOS (PDV)
- Crons para sincronizar vendas e expirar pontos
- Area admin protegida por token

## 2. Pre-requisitos

- Node.js 20+
- NPM (vem com Node)
- Conta no Supabase
- Token da SAIPOS

## 3. Rodar localmente (Windows PowerShell)

```powershell
git clone <URL_DO_REPO>
cd fidelidade
npm install
Copy-Item .env.example .env.local
```

Edite ` .env.local ` com:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SAIPOS_TOKEN`
- `SAIPOS_ID`
- `ADMIN_SECRET_TOKEN`
- `NEXT_PUBLIC_ADMIN_TOKEN`
- `CRON_SECRET`

Depois:

```powershell
npm run dev
```

Abra `http://localhost:3000`.

## 4. Como testar rapido

### Build e tipagem

```powershell
npm run build
npx tsc --noEmit
```

### Suite de integracao

```powershell
node tests/saipos-integration.js
```

Esperado atualmente: `16 passaram, 0 falharam`.

## 5. Tokens e seguranca

- Admin API: `Authorization: Bearer <ADMIN_SECRET_TOKEN>`
- Cron API: `Authorization: Bearer <CRON_SECRET>`
- Webhook SAIPOS: header `x-auth-token: <SAIPOS_TOKEN>`

Nunca comite `.env.local`.

## 6. Erros comuns e como resolver

### Erro no SQL Editor: `syntax error at or near "supabase"`

Causa: foi colado o caminho do arquivo em vez do SQL.

Correto:
1. Abra o arquivo `.sql`
2. Copie o conteudo
3. Cole no Supabase SQL Editor
4. Execute

### `Cliente nao autorizado` na SAIPOS

- Token SAIPOS expirado ou invalido
- Atualize `SAIPOS_TOKEN` em `.env.local`
- Reinicie servidor (`npm run dev`)

### Cron demora e da timeout no teste

- Crons SAIPOS fazem chamadas externas e podem demorar
- O script de teste ja usa timeout maior para esses endpoints

## 7. Ordem recomendada para evoluir

1. Rodar app local
2. Rodar build
3. Rodar testes de integracao
4. Revisar `docs/GUIA-OPERACAO-E-TESTES.md`
5. So depois mexer em regras de negocio

## 8. Arquivos mais importantes

- `src/lib/fidelidade-rules.ts`
- `src/app/api/cron/saipos/processarVenda.ts`
- `src/app/api/_utils/validateAdminAuth.ts`
- `tests/saipos-integration.js`
- `vercel.json`
