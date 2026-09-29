import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSessionStore } from './session-store.mjs';
import { createSessionController } from './session-controller.mjs';
import { createControlServer } from './http-server.mjs';
import { privateSocketOptions } from './core.mjs';

const flags = process.argv.slice(2);
if (flags.length !== 2 || !flags.includes('--serve') || !flags.includes('--dedicated-number')) {
  process.stderr.write('Serviço desligado. Use --serve --dedicated-number com ambiente privado configurado.\n');
  process.exitCode = 1;
} else {
  // Dependencies can log protocol payloads; this process exposes only fixed text.
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir']) console[method] = () => {};
  let store, controller, server;
  let stopping = false;
  async function stop(failed = false) {
    if (stopping) return;
    stopping = true;
    server?.close();
    try { if (controller) await controller.close(); else await store?.close(); } catch { failed = true; }
    process.exit(failed ? 1 : 0);
  }
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
  process.once('uncaughtException', () => void stop(true));
  process.once('unhandledRejection', () => void stop(true));
  try {
    const directory = process.env.WHATSAPP_QR_SESSION_DIR || '';
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    const rel = relative(repo, resolve(directory));
    if (!isAbsolute(directory) || !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error('Private directory required');
    if (process.env.WHATSAPP_QR_SESSION_KEY === process.env.WHATSAPP_QR_CONTROL_TOKEN) throw new Error('Use distinct keys');
    const port = Number(process.env.WHATSAPP_QR_PORT || 8787);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
    const { default: makeWASocket, initAuthCreds, DisconnectReason, BufferJSON, proto } = await import('@whiskeysockets/baileys');
    const { default: pino } = await import('pino');
    store = await openSessionStore({ directory, keyHex: process.env.WHATSAPP_QR_SESSION_KEY || '', initCredentials: initAuthCreds, codec: BufferJSON,
      restoreKey: (type, value) => type === 'app-state-sync-key' ? proto.Message.AppStateSyncKeyData.fromObject(value) : value });
    controller = createSessionController({ store, restartRequired: DisconnectReason.restartRequired, loggedOut: DisconnectReason.loggedOut,
      makeSocket: (auth) => makeWASocket(privateSocketOptions(auth, pino({ level: 'silent' }))) });
    server = createControlServer(controller, process.env.WHATSAPP_QR_CONTROL_TOKEN || '');
    server.on('error', () => void stop(true));
    server.listen(port, '127.0.0.1', () => process.stdout.write('Controle WhatsApp local pronto. Inicie o pareamento pelo admin. Nenhuma mensagem será enviada.\n'));
  } catch {
    process.stderr.write('Não foi possível iniciar. Confira configuração, chave e lock do serviço.\n');
    await stop(true);
  }
}
