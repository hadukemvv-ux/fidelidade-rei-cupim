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

### Teste isolado de conexão WhatsApp por QR (não é OTP pronto)

Somente número separado, em terminal local privado, Node 24+. Não roda na Vercel.
Não envia mensagens nem importa conversas. Sessão apenas em memória: ao reiniciar,
é necessário escanear novamente. Encerra em 5 minutos ou com Ctrl+C; confira no
celular e remova o aparelho de teste caso continue vinculado. Não compartilhe o QR.

```bash
cd services/whatsapp-qr
npm ci --ignore-scripts
npm test
npm start -- --connect --test-only --dedicated-number
```

Integração não oficial: pode haver bloqueio/desconexão. Este ensaio não liga
cadastro, OTP, campanha ou baixas reais no site.

### Serviço local persistente e contrato do admin (piloto)

Em `services/whatsapp-qr`, `npm run serve -- --serve --dedicated-number` inicia
o controle em `127.0.0.1:8787`; não conecta até receber o comando autenticado.
Configure no ambiente privado do processo `WHATSAPP_QR_CONTROL_TOKEN` (64 hex
aleatórios), `WHATSAPP_QR_SESSION_KEY` (outros 64 hex) e
`WHATSAPP_QR_SESSION_DIR` (pasta absoluta privada **fora do repositório**).
A chave de sessão fica só no worker. Restrinja a pasta e os segredos ao usuário
do serviço, inclusive pelas permissões do Windows. Não copiar para backups públicos.

No Next local: `WHATSAPP_QR_CONTROL_ENABLED=true`,
`WHATSAPP_QR_CONTROL_URL=http://127.0.0.1:8787` e o mesmo token de controle.
Em produção, a URL precisa ser HTTPS, chegando a um processo contínuo por proxy
privado; a Vercel não consegue acessar o localhost deste computador.
Esta entrega não contrata hospedagem nem configura esse endpoint público.

Contrato para a tela do Claude: `/api/admin/whatsapp/conexao`, somente superadmin,
com `Authorization: Bearer <sessão Supabase>`. GET retorna
`{status, qr, qr_expires_at}`; POST aceita `{"action":"connect"}` ou
`{"action":"disconnect"}`. Consultar a cada 3 segundos enquanto a tela estiver
visível; renderizar QR com `qrcode.react`, removê-lo ao expirar/sair da página,
e nunca salvar em localStorage, analytics ou logs. O segredo do worker não vai
ao navegador. Após erro, consultar estado antes de repetir o comando.

Estados: `disconnected`, `connecting`, `qr`, `connected`, `disconnecting`, `error`.
Encerrar o worker preserva a sessão criptografada; reiniciar e clicar conectar
reutiliza essa sessão. Desconectar tenta desvincular no WhatsApp antes de limpar
as credenciais. Falha de desvinculação mantém o arquivo para investigação.
Uma segunda instância é bloqueada por `session.lock`; após interrupção abrupta,
confirme que o processo anterior terminou antes de remover somente esse lock.
Não apague `session.enc` para recuperar erros de chave. Se precisar revogar o
vínculo, use também Aparelhos conectados no celular.

Testes: `npm test` nessa pasta e `npm run test:unit` na raiz. Não há método de
envio de mensagens, OTP nem importação de conversas nesse serviço.
