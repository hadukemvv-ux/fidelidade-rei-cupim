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
A implantação Oracle/HTTPS e os procedimentos de recuperação estão em
[docs/referencia/WHATSAPP_HOSPEDAGEM_E_RECUPERACAO.md](docs/referencia/WHATSAPP_HOSPEDAGEM_E_RECUPERACAO.md).

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

Testes: `npm test` nessa pasta e `npm run test:unit` na raiz. Por padrão não há
envio; OTP, campanhas e importação de conversas continuam sem integração.

### Envio manual fechado (somente piloto autorizado)

No ambiente privado do **worker**, `WHATSAPP_QR_SEND_MODE=test` e
`WHATSAPP_QR_TEST_RECIPIENTS` (lista E.164 aprovada, até três destinos) habilitam
`POST /messages/test`, com o mesmo token de controle e corpo
`{"request_id":"<UUID>","recipient":"<destino aprovado>"}`. Essa rota é somente
loopback: **não acrescentar ao proxy público**, nem guardar destinos no Git.
O worker aceita apenas a mensagem fixa de conexão; não recebe texto livre,
mídia, grupos, agendamento ou código OTP. Não existe botão/rota de envio no Next.

Reserva criptografada precede o transporte. Cada destino admite um teste:
novo UUID, chamadas simultâneas, reinício ou desvinculação não permitem repetir.
Antes do envio, consultar somente o destino aprovado com `onWhatsApp` e usar
seu endereço retornado; resposta ausente/ambígua/inesperada bloqueia o envio.
Não remover o nono dígito do cadastro nem gerar o destino por tentativa.
Se o responsável autorizar explicitamente outro ensaio após investigação,
`WHATSAPP_QR_TEST_APPROVED_REQUEST_ID` no worker deve fixar um UUID novo:
só esse ID admite uma tentativa adicional, inclusive após reinício, sem apagar
registros anteriores. Não renovar o ID automaticamente ou por erro de rede.
Resultado `accepted` significa aceito pelo transporte, não entregue/lido;
`unknown` exige investigação e **nunca reenvio cego**. O registro limitado a 20
reservas guarda UUID, HMAC do destino e estado, não telefone/texto.
Ao encerrar, usar `WHATSAPP_QR_SEND_MODE=disabled`, remover a lista e o ID temporários,
reiniciar e reconectar a sessão. Não apagar o registro para permitir novo envio.
Modelos de verificação/cadastro/garçom em `src/lib/whatsappMessageCatalog.ts`
são rascunhos testados, sem disparo automático ou integração operacional.

### OTP pelo QR — código preparado, não ativado

A branch de OTP integra `/api/otp/solicitar` e `/api/otp/verificar` ao worker,
sem mudar layout ou enviar mensagens em produção. Antes do piloto, revisar
com Claude a migração `202609300001_whatsapp_otp_qr.sql`, testar concorrência
com duas conexões PostgreSQL e obter autorização para aplicação/ativação.
`npm run test:unit` usa PGlite **em memória**, sem credenciais ou banco real;
`npm test --prefix services/whatsapp-qr` usa socket fictício. Testes isolados não
provam cadastro/reset de PIN no celular nem concorrência entre conexões reais.

Configuração futura (valores somente nos gerenciadores privados de segredos):

- Next: `WHATSAPP_OTP_PROVIDER=qr`, `WHATSAPP_OTP_ENABLED=true`,
  `WHATSAPP_QR_OTP_ENABLED=true`, `WHATSAPP_OTP_BETA_ONLY=true` e
  `WHATSAPP_OTP_BETA_PHONES` com 1–3 destinos de teste aprovados.
- Next: `WHATSAPP_QR_OTP_CODE_KEY` (32 bytes aleatórios em base64url),
  `WHATSAPP_QR_OTP_URL` (origem HTTPS; HTTP loopback só em desenvolvimento).
- Next e worker: `WHATSAPP_QR_OTP_TOKEN` (64 hex aleatórios), distinto do token
  de controle, chave de sessão e chave do código. A chave de código fica só no Next.
- Worker: `WHATSAPP_QR_OTP_ENABLED=true` e `WHATSAPP_QR_OTP_RECIPIENTS` com os
  mesmos destinos em E.164 (`+55` + DDD + telefone). O modo de teste fixo continua
  desligado; não é preciso habilitar `WHATSAPP_QR_SEND_MODE` para OTP.

O worker não precisa da senha/chave de serviço do Supabase. `POST /messages/otp`
usa **token próprio**, corpo estrito `{request_id, recipient, code, expires_at}`,
512 bytes, sem Origin, apenas mensagem fixa com código de seis dígitos. A rota
existe só em loopback por enquanto: **o Caddy atual não a publica**. A liberação
HTTPS dessa rota será uma implantação separada autorizada; não expor outras
rotas, texto livre ou `8787` público, nem colocar token no navegador.

Código válido por 10 minutos desde a reserva. O banco guarda HMAC vinculado ao
UUID, conta todas as reservas (inclusive falhas), limita telefone/IP/24h e cinco
palpites. A confirmação é transacional e emite autorização de cadastro/reset
de uso único, pelo cookie HttpOnly já existente. Reenvio explícito substitui
o código anterior do mesmo propósito; nunca retentar automaticamente um envio.
O worker mantém ledger criptografado separado: UUID, HMAC do conteúdo/destino,
horário e estado, sem telefone/código/texto em claro. Reserva precede `sendMessage`,
inclusive sob chamadas simultâneas; pendência/timeout não podem ser reenviados
após restart. Tetos do piloto: 60s, 3/telefone/hora, 30 em 24h, 1.000 registros;
ao atingir o cap, bloquear e revisar retenção, **não apagar para repetir envio**.

Contrato adicional para Claude: solicitar retorna `envio: 'aceito' | 'indeterminado'`.
Nenhum deles comprova entrega. Em `indeterminado`, permitir conferir o código
caso ele chegue, avisar que não há confirmação e respeitar o cooldown; não mostrar
“enviado com sucesso” nem repetir a requisição automaticamente. O identificador
da solicitação e código entram na confirmação, nunca em logs/analytics.
OTP não concede consentimento promocional e não ativa avisos a garçons/campanhas.
