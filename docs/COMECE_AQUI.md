# Comece aqui — Clube Cupim em uma página

Atualizado em 01/10/2026. Só muda quando o estado geral do projeto muda.

## O que é

Programa de fidelidade do **O Rei do Cupim** (Fortaleza) em `clubecupim.com.br`.
Next.js 16 + Supabase (`asjoubgoccbvftyggunz`) + Vercel (`fidelidade-rei-cupim`).
Push/merge em `main` = deploy automático em produção.

## Estado atual

| Parte | Situação |
| --- | --- |
| Landing | No ar com a proposta comercial do Clube |
| Painel admin e equipe | Funciona: papéis garçom, caixa, gestor e superadmin, com auditoria |
| Roleta V2 | **Piloto técnico** — prêmio interno de R$ 0, sem valor comercial. Visual "Brasa Premium" (vermelho/preto/dourado, arrastar com o dedo, fotos dos prêmios); ensaio em `/roleta/demo` |
| Comanda (2 fotos + QR) e reconciliação Saipos | Funciona no piloto; cron diário confere, não credita nada |
| Pontos/cashback pela Saipos | **Pausado** — processador antigo não pode ser religado |
| Conexão WhatsApp QR | Worker Oracle/HTTPS e painel superadmin; pareamento/reinício e recebimento de mensagem fixa confirmados; destino resolvido pelo WhatsApp, envios fechados; OTP/fila/gatilhos ainda pendentes |
| Cadastro com WhatsApp OTP | **Desligado** na produção; envio pelo QR pronto em branch (ver abaixo) |
| Bot e baixas de prêmios | Só simulador em memória (`/admin/baixas`); registro real pronto em branch |
| Backup do Supabase | **Adiado pelo responsável**: robô pronto, banco recusa a senha em `SUPABASE_DB_URL` (ver ROADMAP) |
| Sorteio, roleta V1, garçons antigos | Legado pausado, a remover |

**Nada está liberado comercialmente para clientes.**

## Pronto, esperando autorização do responsável

Revisado pelos dois agentes, mas **não publicado e sem SQL aplicado**. Migrações na ordem:
`202609290001` (entregas/elegibilidade) → `202609300001` (OTP QR) → `202610010001` (fotos) → `202610010002` (textos).

| Branch | O que traz |
| --- | --- |
| `claude/consolidacao` | **Branch única com as duas frentes** sobre a main atual: código de verificação pelo WhatsApp (lista fechada de 1–3 telefones de teste) e diagnóstico de relógio; baixas reais; troca de foto e de nome/mensagem dos prêmios pelo painel; roleta por `id`/`tipo` |
| (origens) | `codex/whatsapp-otp` (5ec320c) e `claude/premios-textos` (b7cd04e), preservadas |

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
