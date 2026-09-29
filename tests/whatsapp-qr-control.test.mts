import test from 'node:test';
import assert from 'node:assert/strict';
import { qrControlConfig, requestQrControl } from '../src/lib/whatsappQrControl.ts';

const env = { WHATSAPP_QR_CONTROL_ENABLED: 'true', WHATSAPP_QR_CONTROL_TOKEN: 'ab'.repeat(32), WHATSAPP_QR_CONTROL_URL: 'https://worker.example', NODE_ENV: 'production' };

test('QR control stays disabled without complete configuration and requires TLS in production', () => {
  assert.equal(qrControlConfig({}), null);
  assert.equal(qrControlConfig({ ...env, WHATSAPP_QR_CONTROL_ENABLED: 'false' }), null);
  assert.equal(qrControlConfig({ ...env, WHATSAPP_QR_CONTROL_URL: 'http://127.0.0.1:8787' }), null);
  assert.ok(qrControlConfig({ ...env, NODE_ENV: 'development', WHATSAPP_QR_CONTROL_URL: 'http://127.0.0.1:8787' }));
  for (const url of ['https://user:pass@worker.example', 'https://worker.example?token=x', 'https://worker.example/path']) {
    assert.equal(qrControlConfig({ ...env, WHATSAPP_QR_CONTROL_URL: url }), null);
  }
});

test('QR proxy strips upstream details and caches nothing; expired QR is not shown', async () => {
  const transport: typeof fetch = async (_input, init) => {
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.cache, 'no-store');
    return Response.json({ status: 'qr', qr: 'expired-fixture', qr_expires_at: new Date(Date.now() - 1000).toISOString(), credentials: 'never-forward' });
  };
  const response = await requestQrControl(env, 'status', transport);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'connecting', qr: null, qr_expires_at: null });
});

test('QR proxy never retries commands or discloses upstream error bodies', async () => {
  let calls = 0;
  const transport: typeof fetch = async () => { calls++; return new Response('private-credential-fixture', { status: 500 }); };
  const response = await requestQrControl(env, 'connect', transport);
  assert.equal(response.status, 503);
  assert.equal(calls, 1);
  assert.equal((await response.text()).includes('private-credential-fixture'), false);
});

test('QR proxy accepts current QR but rejects oversized responses and malformed state', async () => {
  const valid = await requestQrControl(env, 'status', async () => Response.json({ status: 'qr', qr: 'fixture', qr_expires_at: new Date(Date.now() + 30_000).toISOString() }));
  assert.equal((await valid.json()).qr, 'fixture');
  for (const payload of [{ status: 'unknown' }, { status: 'connected', extra: 'x'.repeat(9000) }]) {
    const response = await requestQrControl(env, 'status', async () => Response.json(payload));
    assert.equal(response.status, 503);
  }
});
