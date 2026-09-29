import { canConnect, createMemoryAuthState, privateSocketOptions,
  disconnectDecision, TEST_DURATION_MS } from './core.mjs';

// Never start from CI, captured Codex output, a background job or npm install.
if (!canConnect(process.argv.slice(2), Boolean(process.stdin.isTTY && process.stdout.isTTY))) {
  process.stdout.write('Teste desligado. Em terminal local interativo: npm start -- --connect --test-only --dedicated-number\n');
  process.exitCode = 1;
} else {
  await run();
}

async function run() {
  const write = (message) => process.stdout.write(`${message}\n`);
  // Some Signal dependencies use console directly; never expose credentials/contacts.
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir']) {
    console[method] = () => {};
  }
  let auth;
  let socket;
  let stopping = false;
  let linked = false;
  let restartCount = 0;
  let lifetime;

  async function stop(failed = false) {
    if (stopping) return;
    stopping = true;
    clearTimeout(lifetime);
    process.stdout.write('\x1b[2J\x1b[H');
    if (linked && socket) {
      // Best effort unlink. No guarantee on network failure: user can remove device.
      await Promise.race([
        socket.logout().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]).catch(() => {});
    }
    socket?.end(new Error('Teste encerrado'));
    auth?.clear();
    write('Teste encerrado; sessão não foi salva. No celular, confira Aparelhos conectados e remova o vínculo do teste caso permaneça.');
    process.exit(failed ? 1 : 0);
  }

  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
  process.once('uncaughtException', () => { void stop(true); });
  process.once('unhandledRejection', () => { void stop(true); });

  write('Teste local de conexão do número dedicado. Não envia mensagens nem importa conversas.');
  write('Duração máxima: 5 minutos. Ctrl+C encerra. Não compartilhe o QR.');
  try {
    const { default: makeWASocket, initAuthCreds, DisconnectReason } = await import('@whiskeysockets/baileys');
    const { default: pino } = await import('pino');
    const { default: qr } = await import('qrcode-terminal');
    auth = createMemoryAuthState(initAuthCreds);
    const logger = pino({ level: 'silent' });
    lifetime = setTimeout(() => { void stop(); }, TEST_DURATION_MS);

    function connect() {
      if (stopping) return;
      const current = makeWASocket(privateSocketOptions(auth.state, logger));
      socket = current;
      current.ev.on('creds.update', (partial) => {
        if (!stopping && socket === current) auth.update(partial);
      });
      current.ev.on('connection.update', (update) => {
        if (stopping || socket !== current) return;
        if (update.qr) {
          process.stdout.write('\x1b[2J\x1b[H');
          write('No WhatsApp do número NOVO: Aparelhos conectados > Conectar aparelho.');
          write('QR privado; este teste não envia mensagens. Ctrl+C encerra.');
          qr.generate(update.qr, { small: true }, write);
        }
        if (update.connection === 'open') {
          linked = true;
          process.stdout.write('\x1b[2J\x1b[H');
          write('Conexão confirmada. Nenhuma mensagem enviada. Ctrl+C para encerrar e desvincular o teste.');
        }
        if (update.connection === 'close') {
          const status = update.lastDisconnect?.error?.output?.statusCode;
          if (disconnectDecision(status, DisconnectReason.restartRequired, restartCount) === 'restart') {
            restartCount += 1;
            connect();
          } else {
            write('Conexão interrompida. Não faremos reconexões automáticas.');
            void stop(true);
          }
        }
      });
    }
    connect();
  } catch {
    // Errors may contain QR, JID or cryptographic state. Do not log them.
    write('Não foi possível iniciar a conexão. Nenhum detalhe privado será exibido.');
    await stop(true);
  }
}
