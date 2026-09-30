# Comece aqui — Clube Cupim em uma página

Atualizado em 30/09/2026. Só muda quando o estado geral do projeto muda.

## O que é

Programa de fidelidade do **O Rei do Cupim** (Fortaleza) em `clubecupim.com.br`.
Next.js 16 + Supabase (`asjoubgoccbvftyggunz`) + Vercel (`fidelidade-rei-cupim`).
Push/merge em `main` = deploy automático em produção.

## Estado atual

| Parte | Situação |
| --- | --- |
| Landing | No ar com a proposta comercial do Clube |
| Painel admin e equipe | Funciona: papéis garçom, caixa, gestor e superadmin, com auditoria |
| Roleta V2 | **Piloto técnico** — prêmio interno de R$ 0, sem valor comercial |
| Comanda (2 fotos + QR) e reconciliação Saipos | Funciona no piloto; cron diário confere, não credita nada |
| Pontos/cashback pela Saipos | **Pausado** — processador antigo não pode ser religado |
| Conexão WhatsApp QR | Worker Oracle/HTTPS e painel superadmin; pareamento/reinício e recebimento de mensagem fixa confirmados; destino resolvido pelo WhatsApp, envios fechados; OTP/fila/gatilhos ainda pendentes |
| Cadastro com WhatsApp OTP | Fluxo preparado, **desligado**; transporte de envio pelo QR ainda não implementado/testado |
| Bot e baixas de prêmios | Só simulador em memória (`/admin/baixas`) |
| Sorteio, roleta V1, garçons antigos | Legado pausado, a remover |

**Nada está liberado comercialmente para clientes.**

## Onde está cada coisa

| Arquivo | Para quê |
| --- | --- |
| `AGENTS.md` | Regras dos agentes, divisão de trabalho e fluxo de git |
| `docs/ROADMAP.md` | O plano: fases, tarefas e dono de cada uma |
| `docs/DIARIO.md` | O que foi feito, uma entrada curta por entrega |
| `docs/referencia/` | Regras de fidelidade, permissões, privacidade, Saipos, WhatsApp, testes, segredos |
| `docs/historico/` | Documentos antigos. Só consulta, não seguir como instrução |

## Rodar localmente

```bash
npm install
npm run dev
npm run test:unit
npx tsc --noEmit
```

Variáveis em `.env.local` (modelo em `.env.example`; regras em
`docs/referencia/SEGREDOS_E_ACESSOS.md`).
