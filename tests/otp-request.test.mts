import test from 'node:test';
import assert from 'node:assert/strict';
import { readOtpJson, OtpRequestError, otpNoStore } from '../src/lib/otpRequest.ts';

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://clube.example/api/otp/solicitar', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body,
  });
}

test('OTP só aceita JSON limitado de mesma origem; rejeita CSRF e conteúdo excessivo', async () => {
  assert.deepEqual(await readOtpJson(request('{"purpose":"fixture"}', { Origin: 'https://clube.example' })), { purpose: 'fixture' });
  const badHeaders: Record<string, string>[] = [{ Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Content-Type': 'text/plain' }];
  for (const headers of badHeaders) {
    await assert.rejects(readOtpJson(request('{}', headers)), OtpRequestError);
  }
  await assert.rejects(readOtpJson(request('x'.repeat(1025))), (error: unknown) => error instanceof OtpRequestError && error.status === 413);
  await assert.rejects(readOtpJson(request('{PRIVATE-CODE')), (error: unknown) => error instanceof Error && !error.message.includes('PRIVATE-CODE'));
});

test('resposta OTP não permite cache e preserva o cookie HttpOnly', () => {
  const response = otpNoStore(new Response('{}', { headers: { 'Set-Cookie': 'fixture=opaque; HttpOnly; SameSite=Strict' } }));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('set-cookie') || '', /HttpOnly/);
});
