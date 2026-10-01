import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSessionStore } from '../services/whatsapp-qr/session-store.mjs';
import { createSessionController } from '../services/whatsapp-qr/session-controller.mjs';
import { createControlServer } from '../services/whatsapp-qr/http-server.mjs';
import { createOtpSender } from '../services/whatsapp-qr/otp-send.mjs';
import { requestQrOtp, confirmQrOtp } from '../src/lib/qrOtpFlow.ts';

// PostgreSQL + actual loopback HTTP + durable worker store, only fake socket.
// PGlite is one engine/connection; production concurrency remains a separate test.
test('OTP integrado sem WhatsApp/Supabase reais, inclusive resposta perdida', async t => {
  const db = new PGlite();
  const recipient = '+5585988887777', phoneHash = 'a'.repeat(64), ipHash = 'b'.repeat(64);
  try {
    await db.exec('create role anon; create role authenticated; create role service_role; create table public.base_clientes_saipos(id bigint);');
    for (const name of ['202609030002_whatsapp_otp.sql', '202609300001_whatsapp_otp_qr.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
    }
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const values = Object.values(args);
      const result = await db.query<{ data: unknown }>(`select public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) as data`, values);
      return { data: result.rows[0].data, error: null };
    };
    for (const lost of [false, true]) {
      await t.test(lost ? 'aceitação perdida não reenvia; código recebido ainda comprova o telefone' : 'reserva → envio → código → grant de uso único', async () => {
        await db.exec('truncate public.otp_verificacoes');
        const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-flow-'));
        const env = { WHATSAPP_OTP_ENABLED: 'true', WHATSAPP_OTP_PROVIDER: 'qr', WHATSAPP_QR_OTP_ENABLED: 'true',
          WHATSAPP_OTP_BETA_ONLY: 'true', WHATSAPP_QR_OTP_RECIPIENTS: recipient,
          WHATSAPP_OTP_BETA_PHONES: recipient,
          WHATSAPP_QR_OTP_CODE_KEY: Buffer.alloc(32, 42).toString('base64url'),
          WHATSAPP_QR_CONTROL_TOKEN: 'cd'.repeat(32), WHATSAPP_QR_OTP_TOKEN: 'ef'.repeat(32),
          WHATSAPP_QR_SESSION_KEY: 'ab'.repeat(32), NODE_ENV: 'test', WHATSAPP_QR_OTP_URL: '' };
        const store = await openSessionStore({ directory, keyHex: env.WHATSAPP_QR_SESSION_KEY, initCredentials: () => ({}), codec: {}, restoreKey: (_type: string, value: unknown) => value });
        let calls = 0, code = '';
        const socket = { ev: new EventEmitter(), end() {}, async logout() {},
          onWhatsApp: async () => [{ exists: true, jid: '558588887777@s.whatsapp.net' }],
          async sendMessage(_jid: string, body: { text: string }) {
            calls++; code = body.text.match(/\b\d{6}\b/)?.[0] || '';
            return { key: { id: 'fixture' } };
          },
        };
        const controller = createSessionController({ store, makeSocket: () => socket, restartRequired: 515, loggedOut: 401 });
        const sender = createOtpSender({ env, store, controller });
        const server = createControlServer(controller, env.WHATSAPP_QR_CONTROL_TOKEN, undefined, sender, env.WHATSAPP_QR_OTP_TOKEN);
        try {
          await controller.command('connect'); socket.ev.emit('connection.update', { connection: 'open' });
          await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
          const address = server.address();
          assert.ok(address && typeof address !== 'string');
          env.WHATSAPP_QR_OTP_URL = `http://127.0.0.1:${address.port}`;
          const row = await rpc('reservar_envio_otp', { p_telefone_hash: phoneHash, p_ip_hash: ipHash, p_proposito: 'cadastro' });
          const id = (row.data as { solicitacao_id: string }).solicitacao_id;
          const transport: typeof fetch = async (url, options) => {
            const response = await fetch(url, options);
            if (lost) { await response.text(); throw new Error('Simulated lost response'); }
            return response;
          };
          assert.equal(await requestQrOtp({ env, rpc, transport }, { id, e164: recipient, phoneHash, purpose: 'cadastro' }), lost ? 'unknown' : 'accepted');
          assert.equal(calls, 1); assert.match(code, /^\d{6}$/);
          await assert.rejects(requestQrOtp({ env, rpc, transport }, { id, e164: recipient, phoneHash, purpose: 'cadastro' }), /preparar/);
          assert.equal(calls, 1);
          const [first, second] = await Promise.all([
            confirmQrOtp({ env, rpc }, { id, phoneHash, purpose: 'cadastro', code, grantHash: 'c'.repeat(64) }),
            confirmQrOtp({ env, rpc }, { id, phoneHash, purpose: 'cadastro', code, grantHash: 'd'.repeat(64) }),
          ]);
          assert.deepEqual([first, second], ['verificado', 'indisponivel']);
          const args = { p_grant_hash: 'c'.repeat(64), p_telefone_hash: phoneHash, p_proposito: 'cadastro' };
          assert.equal((await rpc('consumir_grant_otp', args)).data, true);
          assert.equal((await rpc('consumir_grant_otp', args)).data, false);
        } finally {
          server.closeAllConnections();
          await new Promise<void>(resolve => server.close(() => resolve()));
          await controller.close();
          await rm(directory, { recursive: true, force: true });
        }
      });
    }
  } finally { await db.close(); }
});
