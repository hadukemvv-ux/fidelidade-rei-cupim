import test from 'node:test';
import assert from 'node:assert/strict';
import { qrOtpTransportConfig, dispatchQrOtp, requestQrOtp, confirmQrOtp } from '../src/lib/qrOtpFlow.ts';

const env = { NODE_ENV: 'production', WHATSAPP_OTP_ENABLED: 'true', WHATSAPP_OTP_PROVIDER: 'qr',
  WHATSAPP_QR_OTP_ENABLED: 'true', WHATSAPP_OTP_BETA_ONLY: 'true',
  WHATSAPP_OTP_BETA_PHONES: '+5585988887777',
  WHATSAPP_QR_OTP_TOKEN: 'ab'.repeat(32), WHATSAPP_QR_CONTROL_TOKEN: 'cd'.repeat(32),
  WHATSAPP_QR_OTP_CODE_KEY: Buffer.alloc(32, 42).toString('base64url'), WHATSAPP_QR_OTP_URL: 'https://worker.example' };
const input = { id: '209120b9-df7e-4c9c-a96c-a64a5e4fd497', e164: '+5585988887777', phoneHash: 'e'.repeat(64), purpose: 'cadastro' as const };
const payload = { request_id: input.id, recipient: input.e164, code: '000123', expires_at: new Date(Date.now() + 600_000).toISOString() };

test('OTP QR exige beta fechado, chaves separadas e HTTPS sem URL arbitrária', () => {
  assert.equal(qrOtpTransportConfig(env).origin, 'https://worker.example');
  for (const bad of [{}, { ...env, WHATSAPP_OTP_BETA_ONLY: 'false' }, { ...env, WHATSAPP_QR_OTP_ENABLED: 'false' },
    { ...env, WHATSAPP_OTP_BETA_PHONES: '' }, { ...env, WHATSAPP_OTP_BETA_PHONES: 'bad' },
    { ...env, WHATSAPP_QR_OTP_TOKEN: env.WHATSAPP_QR_CONTROL_TOKEN },
    { ...env, WHATSAPP_QR_OTP_TOKEN: '2a'.repeat(32) },
    ...['http://worker.example', 'https://user:password@worker.example', 'https://worker.example/x', 'https://worker.example/?secret=x', 'https://worker.example/#x'].map(url => ({ ...env, WHATSAPP_QR_OTP_URL: url }))]) {
    assert.throws(() => qrOtpTransportConfig(bad));
  }
});

test('transporte OTP bloqueia destinatário fora da lista antes de chamar a rede', async () => {
  let calls = 0;
  await assert.rejects(dispatchQrOtp(env, { ...payload, recipient: '+5585999999999' }, async () => { calls++; return Response.json({}); }));
  assert.equal(calls, 0);
});

test('envio OTP usa token próprio, no-store, sem redirect e sem devolver corpo/ID do provedor', async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++; assert.equal(url, 'https://worker.example/messages/otp');
    assert.equal(options?.redirect, 'error'); assert.equal(options?.cache, 'no-store');
    assert.equal((options?.headers as Record<string, string>).Authorization, `Bearer ${env.WHATSAPP_QR_OTP_TOKEN}`);
    assert.deepEqual(JSON.parse(String(options?.body)), payload);
    return Response.json({ status: 'accepted', duplicate: false });
  };
  assert.equal(await dispatchQrOtp(env, payload, transport), 'accepted');
  assert.equal(calls, 1);
});

test('falha, timeout e resposta enorme de OTP são indeterminados, sem retry', async () => {
  for (const transport of [async () => { throw new Error('private token/phone'); },
    async () => new Response('private upstream', { status: 503 }),
    async () => new Response('x'.repeat(257)), async () => Response.json({ status: 'delivered' }),
    async () => new Response('{'), async () => Response.json({ status: 'accepted' })]) {
    let calls = 0;
    assert.equal(await dispatchQrOtp(env, payload, async () => { calls++; return transport(); }), 'unknown');
    assert.equal(calls, 1);
  }
});

test('código não vai para o banco/resposta; prepara antes do transporte e persiste aceitação', async () => {
  const sequence: string[] = [];
  let code = '';
  const status = await requestQrOtp({ env,
    rpc: async (name, args) => {
      sequence.push(name);
      assert.equal(JSON.stringify(args).includes(input.e164), false);
      if (name === 'preparar_otp_qr') {
        assert.match(String(args.p_codigo_hash), /^[a-f0-9]{64}$/);
        return { error: null, data: { expira_em: payload.expires_at } };
      }
      assert.deepEqual(args, { p_id: input.id, p_aceito: true });
      return { error: null, data: true };
    }, transport: async (_url, options) => {
      sequence.push('transport'); code = JSON.parse(String(options?.body)).code;
      assert.match(code, /^\d{6}$/);
      return Response.json({ status: 'accepted', duplicate: false });
    },
  }, input);
  assert.equal(status, 'accepted'); assert.equal(status.includes(code), false);
  assert.deepEqual(sequence, ['preparar_otp_qr', 'transport', 'finalizar_envio_otp_qr']);
});

test('preparação rejeitada não envia; falha de transporte é finalizada sem liberar a reserva', async () => {
  let calls = 0;
  await assert.rejects(requestQrOtp({ env, rpc: async () => ({ data: null, error: new Error('private') }),
    transport: async () => { calls++; throw new Error('unexpected'); } }, input), /preparar/);
  assert.equal(calls, 0);
  let finished = false;
  assert.equal(await requestQrOtp({ env, rpc: async (name, args) => {
    if (name === 'preparar_otp_qr') return { error: null, data: { expira_em: payload.expires_at } };
    finished = true; assert.equal(args.p_aceito, false); return { error: null, data: true };
  }, transport: async () => { calls++; throw new Error('timeout'); } }, input), 'unknown');
  assert.equal(finished, true); assert.equal(calls, 1);
});

test('confirmação QR envia somente HMACs para a transação única, sem Twilio', async () => {
  let calls = 0;
  const verify = { id: input.id, phoneHash: input.phoneHash, purpose: input.purpose, code: '000123', grantHash: 'f'.repeat(64) };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls++; assert.equal(name, 'verificar_otp_qr');
    assert.equal(args.p_codigo_hash === verify.code, false);
    assert.equal(Object.hasOwn(args, 'codigo'), false);
    assert.equal(args.p_grant_hash, verify.grantHash);
    return { data: { status: 'verificado' }, error: null };
  };
  assert.equal(await confirmQrOtp({ env, rpc }, verify), 'verificado');
  assert.equal(await confirmQrOtp({ env, rpc }, { ...verify, code: '1234' }), 'invalido');
  await assert.rejects(confirmQrOtp({ env: { ...env, WHATSAPP_QR_OTP_ENABLED: 'false' }, rpc }, verify));
  assert.equal(calls, 1);
});
