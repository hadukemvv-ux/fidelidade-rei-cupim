# Clube Cupim — fidelidade O Rei do Cupim

Programa de fidelidade do O Rei do Cupim (Fortaleza) em https://www.clubecupim.com.br.
Next.js 16 + Supabase + Vercel, com consulta à Saipos.

- **Estado atual e mapa dos documentos:** [docs/COMECE_AQUI.md](docs/COMECE_AQUI.md)
- **Plano e dono de cada tarefa:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **O que foi feito:** [docs/DIARIO.md](docs/DIARIO.md)
- **Regras para agentes de IA (Codex e Claude):** [AGENTS.md](AGENTS.md)

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev:clean    # se o lock .next/dev/lock travar
npm run test:unit
npx tsc --noEmit
```

Variáveis em `.env.local` (modelo em `.env.example`). Nunca commitar `.env.local`.
Regras de cada segredo: [docs/referencia/SEGREDOS_E_ACESSOS.md](docs/referencia/SEGREDOS_E_ACESSOS.md).
