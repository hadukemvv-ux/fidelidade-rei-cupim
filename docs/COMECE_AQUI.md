# Comece aqui — Clube Cupim em uma página

Atualizado em 03/10/2026. Só muda quando o estado geral do projeto muda.

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
| Conexão WhatsApp QR | Worker Oracle/HTTPS e painel superadmin; pareamento/reinício e recebimento de mensagem fixa confirmados; envio manual fechado, OTP liberado apenas ao piloto autorizado; fila/gatilhos/campanhas desligados |
| Cadastro com WhatsApp OTP | **Piloto fechado de dois participantes**; correção revisada pelo Claude e autorizada em 03/10, SQL `202610020002` aplicado/conferido e código publicado em `b1e3356` (Ready); cadastro e consumo OTP na mesma transação; falta reteste real com código novo. Reset de PIN com OTP confirmado pelo responsável |
| Bot e baixas de prêmios | `/admin/baixas` continua simulador; estrutura/API reais preparadas e SQL aplicado, mas gates de entregas/comercial desligados |
| Backup do Supabase | **Funcionando**: diário às 06:00 no GitHub Actions, criptografado, 30 dias, com teste de restauração automático |
| Sorteio, roleta V1, garçons antigos | Legado pausado, a remover |

**Nada está liberado comercialmente para clientes.**

## Consolidação autorizada em 01/10/2026

Revisado pelos dois agentes; responsável autorizou publicação e as quatro migrações, ciente do backup adiado. **SQL aplicado e conferido em produção**, nesta ordem:
`202609290001` (entregas/elegibilidade) → `202609300001` (OTP QR) → `202610010001` (fotos) → `202610010002` (textos) → `202610020001` (correção do salvar, aplicada pelo Claude a pedido do responsável). Em 03/10, aplicada/conferida separadamente a `202610020002` (cadastro atômico), com autorização explícita e sem ampliar o piloto.

| Branch | O que traz |
| --- | --- |
| `claude/consolidacao` + `claude/foto-entrega` | **Duas frentes publicadas na main** em 91616d7, deploy Ready conferido: OTP fechado e diagnóstico de relógio; estrutura de baixas reais; troca de foto e de nome/mensagem pelo painel; roleta por `id`/`tipo` e foto de entrega grátis |
| (origens) | `codex/whatsapp-otp` (5ec320c) e `claude/premios-textos` (b7cd04e), preservadas |

Conferência do banco: roleta em modo teste; zero prêmios comerciais ativos; entregas `habilitado=false` e `permitir_comercial=false`; RPCs restritas ao serviço. OTP implantado separadamente na Oracle/Vercel com autorização do responsável, somente para os dois números da lista privada; **não ampliar participantes, campanhas ou uso comercial sem nova autorização**. Não versionar a lista de telefones.

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
