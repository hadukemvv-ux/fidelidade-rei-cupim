# Status Alpha (Consolidado)

Atualizado em 03/09/2026.

## Resultado tecnico

- Build: OK
- TypeScript: OK
- Integracao SAIPOS: OK
- Testes unitarios locais: 21/21
- Integracao SAIPOS: autenticacao e resposta real confirmadas em 03/09/2026; o provedor apresentou tambem uma falha temporaria PGRST003/504

## Maturidade atual

- Seguranca basica pronta (admin/cron/webhook)
- Fluxo de venda SAIPOS atomico e idempotente
- Resgate atomico com auditoria
- Sessao de cliente assinada e armazenada em cookie HttpOnly
- RLS ativo nas tabelas operacionais e acesso publico direto bloqueado
- Frontend e backend usam a mesma fonte de regras de fidelidade
- Migrations `202609020001`, `202609020002`, `202609020003`, `202609030001` e `202609030002` aplicadas no Supabase
- Cron SAIPOS com retentativas, paginacao, janela de recuperacao de 3 dias e horario civil de Sao Paulo
- Segredos de cron aceitos apenas no cabecalho `Authorization`, nunca na URL
- Cadastro novo, pré-cadastro e recuperação de PIN preparados para confirmação por WhatsApp OTP
- OTP protegido por lista beta, intervalo, limites por telefone/IP e teto global diário no banco
- Grants de OTP são curtos, HttpOnly, vinculados ao telefone/finalidade e de uso único
- PIN previsível da roleta removido; novos PINs usam scrypt com salt
- PINs SHA-256 legados são migrados automaticamente depois de login válido
- Limite de tentativas de PIN registrado no banco, além da proteção local por IP
- Documentacao base pronta para iniciante e para IA

## Riscos abertos (nao bloqueantes)

1. Configurar conta, remetente WhatsApp e Verify Service da Twilio; integração permanece desativada e sem mensagens pagas
2. A janela movel de 90 dias ainda precisa de backfill historico confiavel da Saipos
3. Contrato de schema do sorteio ainda legado (UUID + id_new)
4. Necessidade de evolucao de observabilidade (alertas e metricas)
5. Cobertura de testes unitarios ainda pode crescer
6. Token SAIPOS atual funciona, mas deve ser rotacionado e salvo como Secret na Vercel

## Proximo foco

1. Rotacionar o token SAIPOS com acesso ao painel do fornecedor
2. Configurar Twilio Verify para o beta, cadastrar telefones convidados e fazer o primeiro OTP real acompanhado
3. Consolidar contratos de dados do sorteio
4. Iniciar o novo sistema visual com logo, fotos e referencias aprovadas

## Onde acompanhar o plano

- `docs/ROADMAP.md`
- `docs/GUIA-OPERACAO-E-TESTES.md`
